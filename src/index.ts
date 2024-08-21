import path from 'node:path'
import process from 'node:process'
import fs from 'fs-extra'
import { consola } from 'consola'
import { colorize } from 'consola/utils'
import { runMain as _runMain, defineCommand } from 'citty'
import { confirm, input, password, select } from '@inquirer/prompts'

const { HOME, USERPROFILE } = process.env
const awsDir = path.join(HOME || USERPROFILE || '', '.aws')
const credentialsPath = path.join(awsDir, 'credentials')
const configPath = path.join(awsDir, 'config')

const awsRegions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'af-south-1',
  'ap-east-1',
  'ap-south-1',
  'ap-south-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-southeast-4',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ca-central-1',
  'eu-central-1',
  'eu-central-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-south-1',
  'eu-south-2',
  'eu-north-1',
  'me-south-1',
  'me-central-1',
  'sa-east-1',
]

const mainCommand = defineCommand({
  meta: {
    name: 'credaw',
    version: '1.0.0',
    description: 'CLI tool for easy AWS credential management',
  },
  args: {},
  async run() {
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
  },
})

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

export const runMain = () => _runMain(mainCommand)
