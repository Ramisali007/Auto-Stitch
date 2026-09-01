import { useEffect } from 'react';
import './Privacy.css';

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Privacy Policy — Auto Stitch';
  }, []);

  return (
    <div className="privacy-page page-enter">
      <div className="privacy-container">
        <h1 className="privacy-title">Privacy Policy</h1>

        <div className="privacy-content">
          <p style={{ marginBottom: '40px' }}>
            Effective Date: April 23, 2026
          </p>

          <p>
            At Auto Stitch, we are committed to protecting the privacy and security of our customers' personal information. This Privacy Policy outlines how we collect, use, disclose, and protect the information you provide when interacting with our website, mobile applications, and other services (collectively referred to as the "Services").
          </p>

          <div className="privacy-subheading">Information We Collect</div>
          <p>
            When you use our Services, we may collect personal information that you provide directly and willingly, such as your name, email address, phone number, shipping address, and payment information. By providing your information, you allow us to use/transfer the information shared in the manner provided in this policy.
          </p>

          <div className="privacy-subheading">Usage of Information</div>
          <p>
            We use the above information to process and fulfill your orders, provide customer support, respond to inquiries, improve our products, services and website functionality, personalize your shopping experience, send promotional emails and marketing communications (you may opt out at any time) and to conduct market research and analyze trends.
          </p>

          <div className="privacy-subheading">Information Sharing</div>
          <p>
            We do not transfer your information to third parties in exchange for money and we will not do so. However, we may share your personal information with third parties in the following circumstances:
          </p>
          <p style={{ paddingLeft: '20px' }}>
            <strong>Service Providers:</strong> We may engage trusted third-party companies or individuals to facilitate our Services, such as shipping providers or payment processors. These third parties have limited access to personal information necessary to perform their tasks and are obligated to protect your information.
          </p>
          <p style={{ paddingLeft: '20px' }}>
            <strong>Legal Requirements:</strong> We may disclose personal information if required by law or if that disclosure is necessary to protect our rights under applicable laws or ensure the safety of our users.
          </p>

          <div className="privacy-subheading">Data Security</div>
          <p>
            We take reasonable measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. However, please note that no method of transmission over the internet or electronic storage is 100% secure.
          </p>

          <div className="privacy-subheading">Your Choices</div>
          <p>
            You have the right to access, correct, update, or delete your personal information. You may also choose to opt out of receiving marketing communications from us. Please contact us using the information provided below to exercise your rights.
          </p>

          <div className="privacy-subheading">Children's Privacy</div>
          <p>
            Our Services are not intended for individuals under the age of 16, and we do not knowingly collect personal information from children. If you believe that we may have collected information from a child, please contact us to request deletion.
          </p>

          <div className="privacy-subheading">Business Transfer</div>
          <p>
            In the event of a merger, acquisition, or any other change in control or ownership of our company, your personal information and data may be transferred, assigned, or otherwise shared with the new entity. We will ensure that the new entity abides by the same level of privacy protection as outlined in this Privacy Policy.
          </p>

          <div className="privacy-subheading">Updates to this Privacy Policy</div>
          <p>
            This Privacy Policy is effective as of April 23, 2026 and will remain in effect until revised or updated. We may update this Privacy Policy from time to time to reflect changes in our practices or legal obligations. We encourage you to review this policy periodically.
          </p>

          <div className="privacy-subheading">Contact Us</div>
          <p style={{ marginBottom: '0' }}>
            If you have any questions or concerns about this Privacy Policy or our privacy practices, feel free to email us at <a href="mailto:autostitchsecurity@gmail.com" className="privacy-link">autostitchsecurity@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
