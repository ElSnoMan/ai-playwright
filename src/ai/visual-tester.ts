import { Page, test } from '@playwright/test'
import sanitizeHtml from 'sanitize-html'
import { HumanMessage } from '@langchain/core/messages'
import { z } from 'zod'
import llm from './ai-client'

export const VisualTestResultSchema = z.object({
  success: z.boolean().describe('Whether the visual test condition is met'),
  reason: z.string().describe('Brief explanation of the analysis result'),
  locators: z
    .array(z.string())
    .optional()
    .describe('Playwright locators for elements used in analysis (e.g., "text=Submit", "data-testid=login-button", "#header-nav")'),
})

export type VisualTestResult = z.infer<typeof VisualTestResultSchema>

export class VisualTester {
  private client = llm.withStructuredOutput(VisualTestResultSchema, {
    name: 'visual_test_analysis',
  })

  constructor(readonly page: Page) {}

  /**
   * Use AI to analyze the screenshot and DOM snapshot to answer a question or assertion
   * @param prompt - The prompt to analyze and verify against the screenshot and DOM snapshot
   * @returns The result of the AI analysis
   * @example
   * const result = await visual.check("30% promotion displayed in header")
   * expect(result.success).toBe(true)
   */
  async check(prompt: string): Promise<VisualTestResult> {
    return await test.step('AI Visual Check', async () => {
      // const screenshot = await page.screenshot({ fullPage: true }) // takes a FULL PAGE screenshot, not just the viewport
      const screenshot = await this.page.screenshot()
      const base64Image = screenshot.toString('base64')
      const domSnapshot = await this._getDOMSnapshot()

      try {
        const message = new HumanMessage({
          content: [
            {
              type: 'text',
              text: `You are a visual testing assistant. Analyze the provided screenshot and DOM structure to answer the following question: "${prompt}"

                  You have access to both the visual screenshot and the sanitized HTML structure of the page.

                  For locators, use standard Playwright selector strategies:
                  - Text: "text=Button Text"
                  - CSS: "#id", ".class", "div[data-testid='value']"
                  - Role: "role=button[name='Submit']"
                  - Test ID: "data-testid=my-button"

                  Be precise and focus only on what you can clearly see in the image and/or verify in the DOM structure.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
            {
              type: 'text',
              text: `DOM Structure:\n${domSnapshot}`,
            },
          ],
        })

        const result = await this.client.invoke([message])

        // If we have locators, highlight the elements and take another screenshot
        if (result.locators && result.locators.length > 0) {
          await this.highlightElements(result.locators)
          const highlightedScreenshot = await this.page.screenshot()

          // Save the highlighted screenshot to the test report
          await test.info().attach('ai-analysis-highlighted', {
            body: highlightedScreenshot,
            contentType: 'image/png',
          })
        }

        return result
      } catch (error) {
        console.error('AI analysis failed:', error)
        return {
          success: false,
          reason: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          locators: [],
        }
      }
    })
  }

  /**
   * Highlight the elements in the page that were found by AI
   * @param locators - The locators of the elements to highlight
   */
  async highlightElements(locators: string[]): Promise<void> {
    await test.step('Highlight elements', async () => {
      if (!locators || locators.length === 0) return

      // Add CSS for highlighting
      await this.page.addStyleTag({
        content: `
          .ai-highlight {
            outline: 3px solid #ff6b6b !important;
            outline-offset: 2px !important;
            background-color: rgba(255, 107, 107, 0.1) !important;
            position: relative !important;
          }
          .ai-highlight::before {
            content: "AI Found";
            position: absolute;
            top: -25px;
            left: 0;
            background: #ff6b6b;
            color: white;
            padding: 2px 6px;
            font-size: 12px;
            font-weight: bold;
            z-index: 1000;
            border-radius: 3px;
          }
        `,
      })

      // Highlight each element
      for (const locator of locators) {
        try {
          const element = this.page.locator(locator).first()
          if ((await element.count()) > 0) {
            await element.evaluate((el: Element) => {
              el.classList.add('ai-highlight')
            })
          }
        } catch (error) {
          console.warn(`Could not highlight element with locator: ${locator}`, error)
        }
      }
    })
  }

  /**
   * Get the sanitized DOM snapshot of the page to be used as context for AI
   * @returns The DOM snapshot of the page
   */
  private async _getDOMSnapshot(): Promise<string> {
    return await test.step('Get DOM snapshot', async () => {
      // Get the full HTML content
      const html = await this.page.content()

      // Sanitize the HTML with minimal allowed tags to reduce token usage
      const sanitizedHtml = sanitizeHtml(html, {
        allowedTags: [
          'div',
          'span',
          'p',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'a',
          'button',
          'input',
          'form',
          'label',
          'select',
          'option',
          'ul',
          'ol',
          'li',
          'nav',
          'header',
          'footer',
          'main',
          'section',
          'article',
          'aside',
          'img',
          'table',
          'tr',
          'td',
          'th',
          'tbody',
          'thead',
          'tfoot',
          'br',
          'hr',
          'strong',
          'em',
          'b',
          'i',
        ],
        allowedAttributes: {
          '*': ['class', 'id', 'data-*', 'aria-*', 'role', 'type', 'name', 'value', 'placeholder', 'alt', 'src', 'href', 'target'],
        },
        allowedSchemes: ['http', 'https', 'data'],
        disallowedTagsMode: 'discard',
        parseStyleAttributes: false, // Disable style parsing to reduce size
      })

      return sanitizedHtml
    })
  }
}
