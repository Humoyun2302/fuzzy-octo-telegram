import { Phone, Send, FileText } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useState } from 'react';
import { TermsAndConditions } from './TermsAndConditions';
import { PrivacyPolicy } from './PrivacyPolicy';

export function Footer() {
  const { t } = useLanguage();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const contacts = [
    {
      type: 'telegram',
      label: '@soniyasupport',
      link: 'https://t.me/soniyasupport',
      icon: Send,
    },
  ];

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto pb-24 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-[rgba(255,255,255,0.09)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* About Section */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-[20px]">{t('app.name')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('footer.description')}
            </p>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t('footer.contact')}</h3>
            <div className="flex justify-start">
              {contacts.map((contact, index) => {
                const Icon = contact.icon;
                return (
                  <a
                    key={index}
                    href={contact.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-[#5B8CFF] dark:hover:text-blue-400 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-[rgba(106,166,223,0.01)] dark:bg-gray-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[rgb(0,0,0)]">{contact.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            {t('footer.copyright')} {new Date().getFullYear()} {t('app.name')}. {t('footer.allRightsReserved')}
          </p>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowTerms(true);
              }}
              className="hover:text-[#5B8CFF] dark:hover:text-blue-400 transition-colors"
            >
              {t('footer.termsAndConditions')}
            </a>
          </p>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowPrivacy(true);
              }}
              className="hover:text-[#5B8CFF] dark:hover:text-blue-400 transition-colors"
            >
              {t('footer.privacyPolicy')}
            </a>
          </p>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTerms && (
        <TermsAndConditions onClose={() => setShowTerms(false)} />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <PrivacyPolicy onClose={() => setShowPrivacy(false)} />
      )}
    </footer>
  );
}