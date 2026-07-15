import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('empty-state')).toBeVisible()
})

test('creates a task, streams output and stops it', async ({ page }) => {
  const input = page.getByLabel('任务输入')
  await input.fill('验证停止流程')
  await input.press('Enter')
  await expect(page.getByRole('button', { name: '停止任务' })).toBeVisible()
  await page.getByRole('button', { name: '停止任务' }).click()
  await expect(page.getByText('已停止', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '发送任务' })).toBeVisible()
})

test('persists settings, completes a task and opens diff review', async ({ page }) => {
  await page.getByRole('button', { name: '设置' }).click()
  await page.getByRole('button', { name: '模型与运行' }).click()
  await page.locator('.settings-dialog input[type="number"]').first().fill('0')
  await page.getByRole('button', { name: '关闭设置' }).click()

  const input = page.getByLabel('任务输入')
  await input.fill('请修改 SSE 代码并输出验证摘要')
  await input.press('Enter')
  await expect(page.getByText('已处理', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('已编辑 2 个文件')).toBeVisible()
  await page.getByRole('button', { name: '切换审阅面板' }).click()
  await page.getByTitle('变更').click()
  await expect(page.getByText('web/src/lib/sse.ts').last()).toBeVisible()

  await page.getByRole('button', { name: '设置' }).click()
  await page.getByRole('button', { name: '额度统计' }).click()
  await expect(page.getByText('总 Token')).toBeVisible()
  await expect(page.getByText('已消耗额度')).toBeVisible()
  await page.getByRole('button', { name: '关闭设置' }).click()

  await page.reload()
  await page.getByRole('button', { name: '设置' }).click()
  await page.getByRole('button', { name: '模型与运行' }).click()
  await expect(page.locator('.settings-dialog input[type="number"]').first()).toHaveValue('0')
})

test('exposes the FakeCoding GitHub repository from About', async ({ page }) => {
  await page.getByRole('button', { name: '设置' }).click()
  await page.getByRole('button', { name: '关于' }).click()
  await expect(page.getByRole('link', { name: /chunyangnet\/FakeCoding/ })).toHaveAttribute('href', 'https://github.com/chunyangnet/FakeCoding')
})
