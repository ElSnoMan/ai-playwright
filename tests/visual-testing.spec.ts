import { test, expect } from './fixtures'

test('visually check that the 4 browser logos are displayed', async ({ page, ai }) => {
  await page.goto('https://playwright.dev/')

  // Send screenshot and DOM to AI for analysis
  const result = await ai.check('The 4 main browser logos are displayed under the hero banner')

  // Log the result for debugging
  console.log('Visual test result:', result)

  // Assert the AI's analysis result
  expect(result.success).toBe(true)
  expect(result.reason).toBeTruthy()
  expect(result.reason.length).toBeGreaterThan(0)
})
