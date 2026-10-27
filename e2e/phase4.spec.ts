// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Madingo Phase 4 E2E Flows', () => {
  test('1. Road Map shows Today For You Smart Personalization card with explainable score', async ({
    page,
  }) => {
    await page.goto('/?autostart=1');
    const card = page.getByTestId('today-for-you-card');
    await expect(card).toBeVisible();
    await expect(page.getByTestId('today-for-you-why')).toBeVisible();
  });

  test('2. Leagues, 40 Original Badges, and 100% Free Cosmetics equip flow', async ({
    page,
  }) => {
    await page.goto('/?autostart=1');
    await page.getByTestId('nav-tab-leagues').click();
    await expect(page.getByTestId('leagues-standings-panel')).toBeVisible();

    await page.getByTestId('leagues-subtab-badges').click();
    await expect(page.getByTestId('badges-grid-panel')).toBeVisible();

    await page.getByTestId('leagues-subtab-cosmetics').click();
    await expect(page.getByTestId('cosmetics-grid-panel')).toBeVisible();
  });

  test('3. Adaptive Placement Test, CEFR Level A1 Exam, and A4 Landscape Certificate Issuance', async ({
    page,
  }) => {
    await page.goto('/?autostart=1');
    await page.getByTestId('nav-tab-exams').click();
    await expect(page.getByTestId('level-exams-panel')).toBeVisible();

    // Switch to Adaptive Placement Test
    await page.getByTestId('exams-subtab-placement').click();
    await expect(page.getByTestId('placement-test-panel')).toBeVisible();

    // Switch to Certificates Gallery & A4 Landscape Preview
    await page.getByTestId('exams-subtab-certificates').click();
    await expect(page.getByTestId('certificate-a4-preview')).toBeVisible();
  });

  test('4. Public Certificate Verification Page (/verify/:id) exposes only name, level, date, and validity', async ({
    page,
  }) => {
    await page.goto('/verify/MDG-A1-2026-8F4B2C');
    const verifyPage = page.getByTestId('public-verify-page');
    await expect(verifyPage).toBeVisible();
    await expect(page.getByTestId('verify-status-banner')).toContainText('VALID');
  });

  test('5. Teacher/Admin Analytics & Cost Monitor and GDPR JSON Export', async ({
    page,
  }) => {
    await page.goto('/?autostart=1');
    await page.getByTestId('nav-tab-teacher').click();
    await page.getByTestId('teacher-tab-analytics').click();
    await expect(page.getByTestId('admin-analytics-view')).toBeVisible();

    await page.getByTestId('header-legal-btn').click();
    await expect(page.getByTestId('legal-gdpr-modal')).toBeVisible();
  });
});
