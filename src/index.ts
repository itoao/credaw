import path from 'node:path'
import inquirer from 'inquirer'
import fs from 'fs-extra'
import chalk from 'chalk'

const { HOME, USERPROFILE } = process.env
const awsDir = path.join(HOME || USERPROFILE || '', '.aws')
const credentialsPath = path.join(awsDir, 'credentials')
const configPath = path.join(awsDir, 'config')

const awsRegions = ['us-east-1', 'us-west-2', 'ap-northeast-1', 'eu-west-1']

async function profileExists(profileName: string, filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content.includes(`[${profileName}]`) || content.includes(`[profile ${profileName}]`)
  }
  catch {
    return false
  }
}

async function getAWSConfig() {
  const questions = [
    {
      type: 'input',
      name: 'profile',
      message: 'Enter the profile name:',
      validate: (input: string) => input ? true : 'Profile name is required',
    },
    {
      type: 'input',
      name: 'aws_access_key_id',
      message: 'Enter your AWS Access Key ID:',
      validate: (input: string) => input ? true : 'AWS Access Key ID is required',
    },
    {
      type: 'password',
      name: 'aws_secret_access_key',
      message: 'Enter your AWS Secret Access Key:',
      validate: (input: string) => input ? true : 'AWS Secret Access Key is required',
    },
    {
      type: 'list',
      name: 'region',
      message: 'Select a region:',
      choices: awsRegions,
      pageSize: 10,
    },
  ]

  try {
    const answers = await inquirer.prompt(questions)
    if (await profileExists(answers.profileName, credentialsPath) || await profileExists(answers.profileName, configPath)) {
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: `Profile "${answers.profileName}" already exists. Do you want to overwrite it?`,
        default: false,
      }])
      if (!overwrite) {
        console.log(chalk.yellow('Operation cancelled.'))
        process.exit(0)
      }
    }
    return answers
  }
  catch (error) {
    console.error(chalk.red('An error occurred:'), error)
    throw error
  }
}

async function writeAWSCredentials(profileName: string, awsAccessKeyId: string, awsSecretAccessKey: string) {
  const credentialsData = `\n[${profileName}]\naws_access_key_id=${awsAccessKeyId}\naws_secret_access_key=${awsSecretAccessKey}\n`
  try {
    await fs.ensureFile(credentialsPath)
    const existingContent = await fs.readFile(credentialsPath, 'utf-8')
    const updatedContent = existingContent.replace(new RegExp(`\\[${profileName}\\][^\\[]*`, 'g'), '') + credentialsData
    await fs.writeFile(credentialsPath, `${updatedContent.trim()}\n`)
    console.log(chalk.green(`AWS credentials saved to ${credentialsPath}.`))
  }
  catch (error) {
    console.error(chalk.red('Failed to save credentials:'), error)
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
    console.log(chalk.green(`AWS configuration saved to ${configPath}.`))
  }
  catch (error) {
    console.error(chalk.red('Failed to save configuration:'), error)
  }
}

(async () => {
  const { profileName, awsAccessKeyId, awsSecretAccessKey, region } = await getAWSConfig()
  await writeAWSCredentials(profileName, awsAccessKeyId, awsSecretAccessKey)
  await writeAWSConfig(profileName, region)
})()
