export type WebsiteTestingDisclosureSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type WebsiteTestingDisclosureContentData = {
  title: string;
  intro: string;
  sections: WebsiteTestingDisclosureSection[];
  updatedAt?: string | null;
};

export const WEBSITE_TESTING_DISCLOSURE_TITLE = 'Website Testing Disclosure';

export const WEBSITE_TESTING_DISCLOSURE_INTRO =
  'This website is currently in a testing and development phase.';

export const WEBSITE_TESTING_DISCLOSURE_SECTIONS: WebsiteTestingDisclosureSection[] = [
  {
    title: 'Testing purpose',
    paragraphs: [
      'This website and its features are being made available to a limited group of users for testing, evaluation, feedback, and development purposes only. The website has not yet been officially launched or released to the general public as a commercial service.',
      'By accessing or using this website, you acknowledge and agree that:',
    ],
    bullets: [
      'The website is currently under development and may contain bugs, errors, incomplete features, or temporary functionality.',
      'Features, content, accounts, data, and other aspects of the website may be changed, suspended, or removed at any time without prior notice.',
      'The website is provided for testing and evaluation purposes and should not be considered a fully launched or commercially available service.',
      'You should not rely on the website for critical, sensitive, or important activities during this testing period.',
      'Any content or information submitted during testing may be used by the development team for testing, debugging, improving, and evaluating the website.',
      'Access to the website may be restricted, suspended, or terminated at any time during the testing period.',
      'Unless otherwise stated, participation in the testing program does not create any employment, partnership, agency, investment, or other business relationship between you and the website operator.',
    ],
  },
  {
    title: 'No Commercial Transaction',
    paragraphs: [
      'Unless expressly stated otherwise, the testing phase does not involve the sale or purchase of goods or services. No payment is required to participate in the testing program, and no compensation is promised for participation or feedback.',
    ],
  },
  {
    title: 'Data Loss and Data Responsibility',
    paragraphs: [
      'The website is currently provided in a testing and development environment. During this period, data, documents, files, accounts, content, and other information submitted, uploaded, stored, or generated through the website may be subject to technical errors, system failures, testing activities, changes, suspension, or removal.',
      'To the fullest extent permitted by applicable law, the website operator does not guarantee the availability, integrity, preservation, or recovery of any data, documents, files, accounts, content, or other information submitted, uploaded, stored, or generated through the website during the testing period.',
      'Accordingly, you acknowledge and agree that:',
    ],
    bullets: [
      'You are responsible for maintaining your own backup copies of any important documents, files, data, or other information submitted to or stored on the website.',
      'The website operator is not responsible for any loss, deletion, corruption, alteration, unavailability, or inability to recover data, documents, files, accounts, content, or other information that may occur during the testing period, to the fullest extent permitted by applicable law.',
      'You should not use the website as the sole storage location for important, sensitive, or irreplaceable information during testing.',
      'The website operator does not guarantee that any data or content submitted during testing will be retained, preserved, or available after the testing period.',
      'You should not assume that data, documents, files, or other content will be recoverable if the website experiences technical problems, is modified, suspended, or discontinued.',
    ],
  },
  {
    title: 'Important Notice',
    paragraphs: [
      'This disclosure is intended to explain the current testing status and purpose of the website. It is not intended to waive or exclude any rights or obligations that cannot legally be waived or excluded under applicable law.',
      'By continuing to use the website, you confirm that you understand and agree that you are participating in a testing/development environment and that you should maintain your own backups of any important information submitted to or stored on the website.',
      'Thank you for helping us test and improve the platform.',
    ],
  },
];

export const DEFAULT_WEBSITE_TESTING_DISCLOSURE: WebsiteTestingDisclosureContentData = {
  title: WEBSITE_TESTING_DISCLOSURE_TITLE,
  intro: WEBSITE_TESTING_DISCLOSURE_INTRO,
  sections: WEBSITE_TESTING_DISCLOSURE_SECTIONS,
  updatedAt: null,
};
