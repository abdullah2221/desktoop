import { test, _electron as electron, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Phase 7.1 Sales + Accounting E2E', () => {
  let electronApp: any;
  let window: any;

  test.beforeAll(async () => {
    electronApp = await electron.launch({ args: [path.join(__dirname, '../')] });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    if (electronApp) await electronApp.close();
  });

  test('should create quote, convert invoice, finalize, and record payment', async () => {
    await window.click('button:has-text("Sales Invoices")');

    await window.fill('#quote-customer', 'Arsalan Khan').catch(async () => {
      await window.selectOption('#quote-customer', 'Arsalan Khan');
    });

    await window.selectOption('#quote-customer', 'Arsalan Khan');
    await window.selectOption('select.erp-input >> nth=3', { index: 1 }).catch(() => {});

    // fill first quote line
    await window.selectOption('select.erp-input', 'P001').catch(() => {});
    const productSelects = window.locator('div:has-text("Quote Editor") select');
    await productSelects.nth(2).selectOption({ index: 1 });
    const qtyInputs = window.locator('div:has-text("Quote Editor") input[type="number"]');
    await qtyInputs.nth(0).fill('2');
    await qtyInputs.nth(1).fill('500');

    await window.click('#quote-save');
    await expect(window.locator('text=Quote created successfully')).toBeVisible();

    const convertButton = window.locator('button:has-text("Convert")').first();
    await convertButton.click();
    await expect(window.locator('text=Quote converted into draft invoice')).toBeVisible();

    await window.click('#sales-tab-invoices');
    const finalizeButton = window.locator('button:has-text("Finalize")').first();
    await finalizeButton.click();
    await expect(window.locator('text=Invoice finalized')).toBeVisible();

    await window.click('#sales-tab-payments');
    await window.selectOption('#payment-invoice', { index: 1 });
    await window.fill('#payment-amount', '500');
    await window.click('#payment-save');
    await expect(window.locator('text=Payment recorded')).toBeVisible();
  });

  test('should create account, post balanced journal, block unbalanced journal', async () => {
    await window.click('button:has-text("Accounting")');

    await window.click('#account-add');
    await window.fill('#account-code', '7999');
    await window.fill('#account-name', 'E2E Suspense');
    await window.click('#account-save');
    await expect(window.locator('text=Account saved successfully')).toBeVisible();

    await window.click('#accounting-tab-journals');
    await window.click('#journal-add');
    await window.fill('#journal-description', 'E2E balanced journal');

    const accountSelect0 = window.locator('#journal-line-account-0');
    const accountSelect1 = window.locator('#journal-line-account-1');
    await accountSelect0.selectOption({ index: 1 });
    await accountSelect1.selectOption({ index: 2 });

    const debit0 = window.locator('tbody tr').nth(0).locator('input[type="number"]').nth(0);
    const credit1 = window.locator('tbody tr').nth(1).locator('input[type="number"]').nth(1);
    await debit0.fill('500');
    await credit1.fill('500');

    await window.click('#journal-save');
    await expect(window.locator('text=Journal posted successfully')).toBeVisible();

    await window.click('#journal-add');
    await window.fill('#journal-description', 'E2E unbalanced journal');
    await accountSelect0.selectOption({ index: 1 });
    await accountSelect1.selectOption({ index: 2 });
    await debit0.fill('300');
    await credit1.fill('100');
    await expect(window.locator('#journal-save')).toBeDisabled();
  });
});
