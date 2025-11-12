export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">
          Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Mamba Host Panel ("Service"), you agree to be bound by these Terms of Service ("Terms").
          If you do not agree to these Terms, do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Mamba Host provides game server hosting and management services. The Service allows you to deploy, configure,
          and manage game servers through our web-based control panel.
        </p>

        <h2>3. User Obligations</h2>
        <p>You agree to:</p>
        <ul>
          <li>Provide accurate and complete registration information</li>
          <li>Maintain the security of your account credentials</li>
          <li>Comply with all applicable laws and regulations</li>
          <li>Not use the Service for any illegal or unauthorized purpose</li>
          <li>Not interfere with or disrupt the Service or servers</li>
        </ul>

        <h2>4. Acceptable Use Policy</h2>
        <p>You may not use the Service to:</p>
        <ul>
          <li>Host malicious software, phishing sites, or illegal content</li>
          <li>Launch denial-of-service attacks or network abuse</li>
          <li>Engage in cryptocurrency mining without authorization</li>
          <li>Violate intellectual property rights of others</li>
          <li>Harass, threaten, or impersonate other users</li>
        </ul>

        <h2>5. Billing and Payment</h2>
        <p>
          Subscription fees are billed in advance on a recurring basis. You authorize us to charge your payment method
          for all fees incurred. Usage-based charges are calculated monthly based on your actual resource consumption.
        </p>

        <h2>6. Service Availability</h2>
        <p>
          We strive for 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be
          announced in advance when possible. We are not liable for service interruptions beyond our control.
        </p>

        <h2>7. Data and Content</h2>
        <p>
          You retain ownership of all content you upload to the Service. You grant us a license to host and process
          your content as necessary to provide the Service. We implement industry-standard security measures but
          recommend maintaining your own backups.
        </p>

        <h2>8. Termination</h2>
        <p>
          You may cancel your subscription at any time. We reserve the right to suspend or terminate accounts that
          violate these Terms. Upon termination, your servers will be shut down and data will be retained for 30 days
          before permanent deletion.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Mamba Host shall not be liable for any indirect, incidental,
          special, consequential, or punitive damages arising from your use of the Service. Our total liability
          is limited to the amount you paid in the 12 months preceding the claim.
        </p>

        <h2>10. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Mamba Host from any claims, damages, or expenses arising from
          your use of the Service or violation of these Terms.
        </p>

        <h2>11. Changes to Terms</h2>
        <p>
          We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance
          of the modified Terms. Material changes will be communicated via email.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the jurisdiction in which Mamba Host operates, without regard to
          conflict of law provisions.
        </p>

        <h2>13. Contact Information</h2>
        <p>
          For questions about these Terms, please contact us at:{' '}
          <a href="mailto:legal@mambahost.com">legal@mambahost.com</a>
        </p>

        <div className="mt-8 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>
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
