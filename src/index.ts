#!/usr/bin/env node
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
      name: 'profileName',
      message: 'プロファイル名を入力してください:',
      validate: (input: string) => input ? true : 'プロファイル名は必須です',
    },
    {
      type: 'input',
      name: 'awsAccessKeyId',
      message: 'AWS Access Key IDを入力してください:',
      validate: (input: string) => input ? true : 'AWS Access Key IDは必須です',
    },
    {
      type: 'password',
      name: 'awsSecretAccessKey',
      message: 'AWS Secret Access Keyを入力してください:',
      validate: (input: string) => input ? true : 'AWS Secret Access Keyは必須です',
    },
    {
      type: 'list',
      name: 'region',
      message: 'リージョンを選択してください:',
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
        message: `プロファイル "${answers.profileName}" は既に存在します。上書きしますか？`,
        default: false,
      }])
      if (!overwrite) {
        console.log(chalk.yellow('操作がキャンセルされました。'))
        process.exit(0)
      }
    }
    return answers
  }
  catch (error) {
    console.error(chalk.red('エラーが発生しました:'), error)
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
    console.log(chalk.green(`AWSクレデンシャルが ${credentialsPath} に保存されました。`))
  }
  catch (error) {
    console.error(chalk.red('クレデンシャルの保存に失敗しました:'), error)
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
    console.log(chalk.green(`AWS設定が ${configPath} に保存されました。`))
  }
  catch (error) {
    console.error(chalk.red('設定の保存に失敗しました:'), error)
  }
}

(async () => {
  const { profileName, awsAccessKeyId, awsSecretAccessKey, region } = await getAWSConfig()
  await writeAWSCredentials(profileName, awsAccessKeyId, awsSecretAccessKey)
  await writeAWSConfig(profileName, region)
})()
