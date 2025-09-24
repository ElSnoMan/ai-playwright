import { test as base } from '@playwright/test'
import { VisualTester } from '../src/ai/visual-tester'


type CustomFixtures = {
  ai: VisualTester
}


export const test = base.extend<CustomFixtures>({
  ai: async ({ page }, use) => {
    const visualTester = new VisualTester(page)
    await use(visualTester)
  },
})


export { expect } from '@playwright/test'
