import path from 'node:path'
import process from 'node:process'
import fs from 'fs-extra'
import { consola } from 'consola'
import { colorize } from 'consola/utils'
import { runMain as _runMain, defineCommand } from 'citty'
import { confirm, input, password, select } from '@inquirer/prompts'
import { readPackageJSON } from 'pkg-types'
import { awsRegions } from './constants/aws-region'

const { HOME, USERPROFILE } = process.env
const awsDir = path.join(HOME || USERPROFILE || '', '.aws')
const credentialsPath = path.join(awsDir, 'credentials')
const configPath = path.join(awsDir, 'config')

const mainCommand = defineCommand({
  meta: {
    name: 'credaw',
    version: '1.0.0',
    description: 'CLI tool for easy AWS credential management',
  },
  args: {
    version: {
      type: 'boolean',
      description: 'Show version',
      alias: 'v',
    },
  },
  async run({ args }) {
    if (args.version) {
      const { version } = await readPackageJSON(process.cwd())
      consola.info(version)
      return
    }

    const action = await select({
      message: 'Select an action:',
      choices: [
        { value: 'add', name: 'Add a new profile' },
        { value: 'list', name: 'List existing profiles' },
        { value: 'update', name: 'Update an existing profile' },
        { value: 'delete', name: 'Delete a profile' },
      ],
    })

    switch (action) {
      case 'add':
        await addProfile()
        break
      case 'list':
        await listProfiles()
        break
      case 'update':
        await updateProfile()
        break
      case 'delete':
        await deleteProfile()
        break
    }
  },
})

async function addProfile() {
  const profile = await input({ message: 'Enter the profile name:' })
  const awsAccessKeyId = await input({ message: 'Enter your AWS Access Key ID:' })
  const awsSecretAccessKey = await password({
    message: 'Enter your AWS Secret Access Key:',
    mask: '*',
  })
  const region = await select({
    message: 'Select a region:',
    choices: awsRegions.map(r => ({ value: r, name: r })),
  })

  if (await profileExists(profile, credentialsPath) || await profileExists(profile, configPath)) {
    const overwrite = await confirm({
      message: `Profile "${profile}" already exists. Overwrite?`,
      default: false,
    })
    if (!overwrite) {
      consola.info('Operation cancelled.')
      return
    }
  }

  await writeAWSCredentials(profile, awsAccessKeyId, awsSecretAccessKey)
  await writeAWSConfig(profile, region)
}

async function listProfiles() {
  const credentials = await fs.readFile(credentialsPath, 'utf-8')
  const config = await fs.readFile(configPath, 'utf-8')

  const credentialProfiles = credentials.match(/\[.+?\]/g) || []
  const configProfiles = config.match(/\[profile .+?\]/g) || []

  const profiles = new Set([
    ...credentialProfiles.map(p => p.slice(1, -1)),
    ...configProfiles.map(p => p.slice(9, -1)),
  ])

  consola.info('Existing profiles:')
  profiles.forEach(profile => consola.log(profile))
}

async function updateProfile() {
  const profiles = await getExistingProfiles()
  const profile = await select({
    message: 'Select the profile to update:',
    choices: profiles.map(p => ({ value: p, name: p })),
  })

  const awsAccessKeyId = await input({ message: 'Enter your new AWS Access Key ID:' })
  const awsSecretAccessKey = await password({
    message: 'Enter your new AWS Secret Access Key:',
    mask: '*',
  })
  const region = await select({
    message: 'Select a new region:',
    choices: awsRegions.map(r => ({ value: r, name: r })),
  })

  await writeAWSCredentials(profile, awsAccessKeyId, awsSecretAccessKey)
  await writeAWSConfig(profile, region)
}

async function deleteProfile() {
  const profiles = await getExistingProfiles()
  const profile = await select({
    message: 'Select the profile to delete:',
    choices: profiles.map(p => ({ value: p, name: p })),
  })

  const confirmDelete = await confirm({
    message: `Are you sure you want to delete profile "${profile}"?`,
    default: false,
  })
  if (!confirmDelete) {
    consola.info('Operation cancelled.')
    return
  }

  await removeProfileFromFile(profile, credentialsPath)
  await removeProfileFromFile(profile, configPath)
  consola.success(`Profile "${profile}" has been deleted.`)
}

async function profileExists(profileName: string, filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content.includes(`[${profileName}]`) || content.includes(`[profile ${profileName}]`)
  }
  catch {
    return false
  }
}

async function writeAWSCredentials(profileName: string, awsAccessKeyId: string, awsSecretAccessKey: string) {
  const credentialsData = `\n[${profileName}]\naws_access_key_id=${awsAccessKeyId}\naws_secret_access_key=${awsSecretAccessKey}\n`
  try {
    await fs.ensureFile(credentialsPath)
    const existingContent = await fs.readFile(credentialsPath, 'utf-8')
    const updatedContent = existingContent.replace(new RegExp(`\\[${profileName}\\][^\\[]*`, 'g'), '') + credentialsData
    await fs.writeFile(credentialsPath, `${updatedContent.trim()}\n`)
    consola.success(`AWS credentials saved to ${colorize('green', credentialsPath)}.`)
  }
  catch (error) {
    consola.error('Failed to save credentials:', error)
  }
}

async function writeAWSConfig(profileName: string, region: string) {
  const configData = `[profile ${profileName}]\nregion=${region}\n`
  try {
    await fs.ensureFile(configPath)
    const existingContent = await fs.readFile(configPath, 'utf-8')
    const cleanedContent = existingContent.replace(new RegExp(`\\[profile ${profileName}\\][^\\[]*`, 'g'), '').trim()
    const contentToWrite = cleanedContent + (cleanedContent ? '\n\n' : '') + configData
    await fs.writeFile(configPath, contentToWrite)
    consola.success(`AWS configuration saved to ${colorize('green', configPath)}.`)
  }
  catch (error) {
    consola.error('Failed to save configuration:', error)
  }
}

async function removeProfileFromFile(profileName: string, filePath: string) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const updatedContent = content.replace(new RegExp(`\\[${profileName}\\][^\\[]*`, 'g'), '')
      .replace(new RegExp(`\\[profile ${profileName}\\][^\\[]*`, 'g'), '')
      .trim()
    await fs.writeFile(filePath, `${updatedContent}\n`)
  }
  catch (error) {
    consola.error(`Failed to remove profile from ${filePath}:`, error)
  }
}

async function getExistingProfiles(): Promise<string[]> {
  const credentials = await fs.readFile(credentialsPath, 'utf-8')
  const config = await fs.readFile(configPath, 'utf-8')

  const credentialProfiles = credentials.match(/\[.+?\]/g) || []
  const configProfiles = config.match(/\[profile .+?\]/g) || []

  return Array.from(new Set([
    ...credentialProfiles.map(p => p.slice(1, -1)),
    ...configProfiles.map(p => p.slice(9, -1)),
  ]))
}

export const runMain = () => _runMain(mainCommand)
