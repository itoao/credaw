import path from 'node:path'
import fs from 'fs-extra'
import { consola } from 'consola'
import { runMain as _runMain, defineCommand } from 'citty'
import inquirer from 'inquirer'

const { HOME, USERPROFILE } = process.env
const awsDir = path.join(HOME || USERPROFILE || '', '.aws')
const credentialsPath = path.join(awsDir, 'credentials')
const configPath = path.join(awsDir, 'config')

const awsRegions = ['us-east-1', 'us-west-2', 'ap-northeast-1', 'eu-west-1']

const mainCommand = defineCommand({
  meta: {
    name: 'credaw',
    version: '1.0.0',
    description: 'CLI tool for easy AWS credential management',
  },
  args: {},
  async run() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'profile',
        message: 'Enter the profile name:',
      },
      {
        type: 'input',
        name: 'awsAccessKeyId',
        message: 'Enter your AWS Access Key ID:',
      },
      {
        type: 'password',
        name: 'awsSecretAccessKey',
        message: 'Enter your AWS Secret Access Key:',
      },
      {
        type: 'list',
        name: 'region',
        message: 'Select a region:',
        choices: awsRegions,
      },
    ])

    const { profile, awsAccessKeyId, awsSecretAccessKey, region } = answers

    if (await profileExists(profile, credentialsPath) || await profileExists(profile, configPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Profile "${profile}" already exists. Overwrite?`,
          default: false,
        },
      ])
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
    consola.success(`AWS credentials saved to ${credentialsPath}.`)
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
    consola.success(`AWS configuration saved to ${configPath}.`)
  }
  catch (error) {
    consola.error('Failed to save configuration:', error)
  }
}

export const runMain = () => _runMain(mainCommand)
