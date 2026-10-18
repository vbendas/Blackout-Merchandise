import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <main className="max-w-4xl mx-auto py-16 px-4 bg-zinc-950 text-white min-h-screen">
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-zinc-50">Privacy Policy</h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            This Privacy Policy explains how Blackout Merchandise Ltd. collects, uses, and protects your personal data in
            accordance with the General Data Protection Regulation (GDPR) and other applicable privacy laws.
          </p>
        </div>

        {/* Section 1: Identity of Controller */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">1. Identity of Data Controller</h2>
          <div className="space-y-2 text-zinc-300">
            <p>
              <strong>Company:</strong> Blackout Merchandise Ltd.
            </p>
            <p>
              <strong>Registration:</strong> Registered in Portugal
            </p>
            <p>
              <strong>Data Protection Officer:</strong> dpo@blackoutmerch.example
            </p>
            <p>
              <strong>Contact for Privacy Matters:</strong> privacy@blackoutmerch.example
            </p>
          </div>
        </section>

        {/* Section 2: Data We Collect */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">2. Data We Collect</h2>
          <div className="space-y-3 text-zinc-300">
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Account Data</h3>
              <p className="text-zinc-400">
                Email address, name, profile image, account preferences, and authentication information.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Usage Data</h3>
              <p className="text-zinc-400">
                Pages visited, features used, time spent on pages, and interaction patterns within our platform.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Order Data</h3>
              <p className="text-zinc-400">
                Shipping address, billing information, payment details, order history, and customer service
                communications.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Technical Data</h3>
              <p className="text-zinc-400">
                IP address, browser type and version, device information, operating system, and interaction data.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Legal Basis for Processing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">3. Legal Basis for Processing</h2>
          <div className="space-y-3 text-zinc-300">
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Consent</h3>
              <p className="text-zinc-400">
                For marketing communications and non-essential cookies. You can withdraw consent at any time.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Contractual Necessity</h3>
              <p className="text-zinc-400">
                To fulfill our contractual obligations for order processing, account management, and service delivery.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Legitimate Interest</h3>
              <p className="text-zinc-400">
                For fraud prevention, security monitoring, service improvement, and direct marketing where permitted.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Legal Obligation</h3>
              <p className="text-zinc-400">
                For tax records, anti-money laundering compliance, and other legal requirements.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Data Sharing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">4. Data Sharing</h2>
          <div className="space-y-3 text-zinc-300">
            <p className="font-medium text-zinc-200">We share data only with trusted partners for specific purposes:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 ml-4">
              <li>
                <strong>Stripe:</strong> Payment processing and financial services
              </li>
              <li>
                <strong>Clerk:</strong> Authentication and user management
              </li>
              <li>
                <strong>Neon:</strong> Database hosting and management
              </li>
              <li>
                <strong>OpenRouter:</strong> AI service integration
              </li>
              <li>
                <strong>Cloudinary:</strong> Media storage and optimization
              </li>
            </ul>
            <p className="text-zinc-200 font-medium">We do NOT sell your personal data to third parties.</p>
          </div>
        </section>

        {/* Section 5: Your Rights */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">5. Your GDPR Rights</h2>
          <div className="space-y-3 text-zinc-300">
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Right to Access</h3>
              <p className="text-zinc-400">Request a complete copy of all personal data we hold about you.</p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Right to Rectification</h3>
              <p className="text-zinc-400">Request correction of inaccurate or incomplete personal data.</p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Right to Erasure</h3>
              <p className="text-zinc-400">Request deletion of your personal data, subject to legal obligations.</p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Right to Portability</h3>
              <p className="text-zinc-400">
                Request your data in a machine-readable format to transfer to another service.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Right to Object</h3>
              <p className="text-zinc-400">Object to processing based on legitimate interests.</p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Right to Withdraw Consent</h3>
              <p className="text-zinc-400">Withdraw consent for marketing communications at any time.</p>
            </div>
            <p className="text-zinc-400">
              Exercise these rights through our{' '}
              <Link href="/data-rights" className="text-zinc-200 underline hover:text-zinc-100">
                Data Rights Portal
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Section 6: Data Retention */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">6. Data Retention</h2>
          <div className="space-y-2 text-zinc-300">
            <p>
              <strong>Account Data:</strong> 2 years from last activity or account deletion
            </p>
            <p>
              <strong>Order Data:</strong> 7 years (legal requirement for tax purposes)
            </p>
            <p>
              <strong>Consent Records:</strong> Until withdrawn, plus 30 days
            </p>
            <p>
              <strong>Analytics Data:</strong> 26 months (aggregated and anonymized after 13 months)
            </p>
            <p>
              <strong>Marketing Communications:</strong> Until consent is withdrawn
            </p>
          </div>
        </section>

        {/* Section 7: Security */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">7. Security Measures</h2>
          <div className="space-y-3 text-zinc-300">
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Encryption at Rest</h3>
              <p className="text-zinc-400">
                All data stored with AES-256 encryption through Neon's secure infrastructure.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Encryption in Transit</h3>
              <p className="text-zinc-400">HTTPS/TLS 1.3 encryption for all data transmissions.</p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Access Controls</h3>
              <p className="text-zinc-400">
                Multi-factor authentication, role-based access, and regular security audits through Clerk.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">Regular Monitoring</h3>
              <p className="text-zinc-400">
                24/7 security monitoring, vulnerability scanning, and incident response procedures.
              </p>
            </div>
          </div>
        </section>

        {/* Section 8: International Transfers */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">8. International Data Transfers</h2>
          <div className="space-y-3 text-zinc-300">
            <p>
              Your data may be transferred to countries outside the European Economic Area (EEA). We ensure adequate
              protection through:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 ml-4">
              <li>European Commission adequacy decisions</li>
              <li>Standard Contractual Clauses (SCCs)</li>
              <li>Binding Corporate Rules where applicable</li>
              <li>Additional safeguards for US transfers</li>
            </ul>
            <p className="text-zinc-400">All our service providers have been vetted for GDPR compliance.</p>
          </div>
        </section>

        {/* Section 9: Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">9. Contact Information</h2>
          <div className="space-y-2 text-zinc-300">
            <p>
              <strong>Data Protection Officer:</strong> dpo@blackoutmerch.example
            </p>
            <p>
              <strong>General Privacy Inquiries:</strong> privacy@blackoutmerch.example
            </p>
            <p>
              <strong>Physical Address:</strong> Available upon request for data subjects
            </p>
            <p>
              <strong>Regulatory Authority:</strong> Portuguese National Data Protection Commission (CNPD)
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-800 pt-8">
          <p className="text-center text-zinc-400">Last updated: January 21, 2026</p>
          <p className="text-center text-zinc-400 mt-2">
            This policy may be updated to reflect changes in our practices or applicable law.
          </p>
        </footer>
      </div>
    </main>
  );
}
