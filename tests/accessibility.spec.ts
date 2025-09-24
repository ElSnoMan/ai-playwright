import { test, expect } from '@playwright/test'
import { checkA11y, injectAxe, getViolations, getAxeResults } from 'axe-playwright'

test('Option 1: Get only violations for custom assertions', async ({ page }) => {
  await page.goto('https://playwright.dev/')
  await injectAxe(page)

  await page.getByRole('link', { name: 'Get started' }).click()

  const violations = await getViolations(page, undefined, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
    }
  })

  console.log(`Found ${violations.length} accessibility violations:`)
  violations.forEach((violation, index) => {
    console.log(`${index + 1}. ${violation.id}: ${violation.description}`)
    console.log(`   Impact: ${violation.impact}`)
    console.log(`   Nodes affected: ${violation.nodes.length}`)
  })

  // Custom assertions based on violations
  expect(violations).toHaveLength(0) // Fail if any violations found

  // Or more flexible assertions:
  // const criticalViolations = violations.filter(v => v.impact === 'critical')
  // expect(criticalViolations).toHaveLength(0) // Only fail on critical issues

  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible()
})

test('Option 2: Get complete axe results (violations, passes, incomplete, inapplicable)', async ({ page }) => {
  await page.goto('https://playwright.dev/')
  await injectAxe(page)

  const results = await getAxeResults(page, undefined, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa']
    }
  })

  console.log('Accessibility Results:')
  console.log(`- Violations: ${results.violations.length}`)
  console.log(`- Passes: ${results.passes.length}`)
  console.log(`- Incomplete: ${results.incomplete.length}`)
  console.log(`- Inapplicable: ${results.inapplicable.length}`)

  // Custom assertions on the full results
  expect(results.violations).toHaveLength(0)

  // You can also assert on other aspects:
  expect(results.passes.length).toBeGreaterThan(0) // Ensure some checks passed

  // Or check specific violation types:
  const colorContrastViolations = results.violations.filter(v => v.id === 'color-contrast')
  expect(colorContrastViolations).toHaveLength(0)
})

test('Option 3: Use checkA11y for automatic pass/fail behavior', async ({ page }) => {
  await page.goto('https://playwright.dev/')
  await injectAxe(page)

  // This will automatically fail the test if violations are found
  await checkA11y(
    page,
    undefined, // context - check entire page
    {
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      },
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    }, // AxeOptions
    false, // skipFailures - false means fail test on violations
    'default' // reporter - use default terminal reporter
  )

  // If we reach this point, no violations were found
  console.log('✅ No accessibility violations detected!')
})

test('Option 4: Use checkA11y with skipFailures=true for reporting without failing', async ({ page }) => {
  await page.goto('https://playwright.dev/')
  await injectAxe(page)

  await checkA11y(
    page,
    undefined,
    {
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa']
        }
      },
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    },
    true, // skipFailures - true means don't fail test, just report
    'default'
  )

  // Since skipFailures=true, test continues regardless of violations
  // You might want to get violations separately for custom logic
  const violations = await getViolations(page, undefined, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa']
    }
  })

  // Custom logic based on violations
  if (violations.length > 0) {
    console.log(`⚠️ Found ${violations.length} violations, but continuing test...`)
    // Maybe only fail on critical issues
    const criticalViolations = violations.filter(v => v.impact === 'critical')
    expect(criticalViolations).toHaveLength(0)
  } else {
    console.log('✅ No accessibility violations detected!')
  }
})
