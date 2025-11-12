export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">
          Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <h2>1. Information We Collect</h2>
        <h3>Account Information</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Name and email address</li>
          <li>Password (encrypted)</li>
          <li>Organization/tenant name</li>
        </ul>

        <h3>Billing Information</h3>
        <p>For paid services, we collect:</p>
        <ul>
          <li>Payment method details (processed securely by Stripe)</li>
          <li>Billing address</li>
          <li>Transaction history</li>
        </ul>

        <h3>Usage Data</h3>
        <p>We automatically collect:</p>
        <ul>
          <li>Server resource usage (CPU, RAM, disk, network)</li>
          <li>Service logs and error reports</li>
          <li>IP addresses and device information</li>
          <li>Session data and authentication tokens</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use collected information to:</p>
        <ul>
          <li>Provide and maintain the Service</li>
          <li>Process payments and prevent fraud</li>
          <li>Send service notifications and updates</li>
          <li>Monitor and improve service performance</li>
          <li>Comply with legal obligations</li>
          <li>Respond to support requests</li>
        </ul>

        <h2>3. Data Sharing and Disclosure</h2>
        <p>We do not sell your personal information. We may share data with:</p>
        <ul>
          <li><strong>Service Providers:</strong> Stripe (payments), email providers, cloud infrastructure</li>
          <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
          <li><strong>Business Transfers:</strong> In connection with mergers or acquisitions</li>
        </ul>

        <h2>4. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active. After account deletion, we retain data for
          30 days before permanent deletion. Billing records are retained for 7 years for tax compliance.
        </p>

        <h2>5. Data Security</h2>
        <p>We implement industry-standard security measures:</p>
        <ul>
          <li>Encryption in transit (TLS 1.3) and at rest (AES-256)</li>
          <li>Regular security audits and penetration testing</li>
          <li>Access controls and audit logging</li>
          <li>Secure password hashing (Argon2)</li>
        </ul>

        <h2>6. Your Rights (GDPR/CCPA)</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Rectification:</strong> Correct inaccurate data</li>
          <li><strong>Erasure:</strong> Request deletion of your data</li>
          <li><strong>Portability:</strong> Export your data in machine-readable format</li>
          <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
        </ul>

        <h2>7. Cookies and Tracking</h2>
        <p>We use essential cookies for:</p>
        <ul>
          <li>Authentication and session management</li>
          <li>Security and fraud prevention</li>
          <li>Service functionality</li>
        </ul>
        <p>We do not use advertising or tracking cookies.</p>

        <h2>8. International Data Transfers</h2>
        <p>
          Your data may be processed in data centers outside your country of residence. We ensure appropriate
          safeguards are in place for international transfers, including Standard Contractual Clauses.
        </p>

        <h2>9. Children's Privacy</h2>
        <p>
          The Service is not intended for users under 13 years old. We do not knowingly collect information
          from children. If you believe we have collected data from a child, contact us immediately.
        </p>

        <h2>10. Changes to Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be notified via email
          and posted on this page with an updated revision date.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          For privacy-related questions or to exercise your rights, contact us at:{' '}
          <a href="mailto:privacy@mambahost.com">privacy@mambahost.com</a>
        </p>

        <div className="mt-8 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            <a href="/legal/terms" className="text-primary hover:underline">Terms of Service</a>
            {' • '}
            <a href="/legal/refund" className="text-primary hover:underline">Refund Policy</a>
            {' • '}
            <a href="/legal/aup" className="text-primary hover:underline">Acceptable Use Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
