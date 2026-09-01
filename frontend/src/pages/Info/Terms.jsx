import { useEffect } from 'react';
import './Terms.css';

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Terms & Conditions — Auto Stitch';
  }, []);

  return (
    <div className="terms-page page-enter">
      <div className="terms-container">
        <h1 className="terms-title-serif">Terms & Conditions</h1>

        <div className="terms-content">
          <p className="terms-header-caps">TERMS OF SERVICE</p>
          <div className="terms-separator">-----</div>

          <div className="terms-section">
            <p className="terms-section-title">OVERVIEW</p>
            <p>This website is operated by AUTO STITCH. Throughout the site, the terms “we”, “us” and “our” refer to AUTO STITCH. AUTO STITCH offers this website, including all information, tools and services available from this site to you, the user, conditioned upon your acceptance of all terms, conditions, policies and notices stated here.</p>
            <p>By visiting our site and/ or purchasing something from us, you engage in our “Service” and agree to be bound by the following terms and conditions (“Terms of Service”, “Terms”), including those additional terms and conditions and policies referenced herein and/or available by hyperlink. These Terms of Service apply to all users of the site, including without limitation users who are browsers, vendors, customers, merchants, and/ or contributors of content.</p>
            <p>Please read these Terms of Service carefully before accessing or using our website. By accessing or using any part of the site, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions of this agreement, then you may not access the website or use any services. If these Terms of Service are considered an offer, acceptance is expressly limited to these Terms of Service.</p>
            <p>Any new features or tools which are added to the current store shall also be subject to the Terms of Service. You can review the most current version of the Terms of Service at any time on this page. We reserve the right to update, change or replace any part of these Terms of Service by posting updates and/or changes to our website. It is your responsibility to check this page periodically for changes. Your continued use of or access to the website following the posting of any changes constitutes acceptance of those changes.</p>
            <p>Our store is hosted on our secure cloud infrastructure. They provide us with the online e-commerce platform that allows us to sell our products and services to you.</p>
          </div>

          <div className="terms-section">
            <p className="terms-section-title">SECTION 1 - ONLINE STORE TERMS</p>
            <p>By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence, or that you are the age of majority in your state or province of residence and you have given us your consent to allow any of your minor dependents to use this site.</p>
            <p>You may not use our products for any illegal or unauthorized purpose nor may you, in the use of the Service, violate any laws in your jurisdiction (including but not limited to copyright laws).</p>
            <p>You must not transmit any worms or viruses or any code of a destructive nature.</p>
            <p>A breach or violation of any of the Terms will result in an immediate termination of your Services.</p>
          </div>

          <div className="terms-section">
            <p className="terms-section-title">SECTION 2 - GENERAL CONDITIONS</p>
            <p>We reserve the right to refuse service to anyone for any reason at any time.</p>
            <p>You understand that your content (not including credit card information), may be transferred unencrypted and involve (a) transmissions over various networks; and (b) changes to conform and adapt to technical requirements of connecting networks or devices. Credit card information is always encrypted during transfer over networks.</p>
            <p>You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service, use of the Service, or access to the Service or any contact on the website through which the service is provided, without express written permission by us.</p>
          </div>

          <div className="terms-section">
            <p className="terms-section-title">SECTION 3 - ACCURACY AND TIMELINESS OF INFORMATION</p>
            <p>We are not responsible if information made available on this site is not accurate, complete or current. The material on this site is provided for general information only and should not be relied upon or used as the sole basis for making decisions without consulting primary, more accurate, more complete or more timely sources of information. Any reliance on the material on this site is at your own risk.</p>
          </div>

          <div className="terms-section">
            <p className="terms-section-title">SECTION 4 - MODIFICATIONS TO THE SERVICE AND PRICES</p>
            <p>Prices for our products are subject to change without notice.</p>
            <p>We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time.</p>
            <p>We shall not be liable to you or to any third-party for any modification, price change, suspension or discontinuance of the Service.</p>
          </div>

          <div className="terms-section">
            <p className="terms-section-title">SECTION 5 - PRODUCTS OR SERVICES</p>
            <p>Certain products or services may be available exclusively online through the website. These products or services may have limited quantities and are subject to return or exchange only according to our Return Policy.</p>
            <p>We have made every effort to display as accurately as possible the colors and images of our products that appear at the store. We cannot guarantee that your computer monitor's display of any color will be accurate.</p>
            <p>We do not warrant that the quality of any products, services, information, or other material purchased or obtained by you will meet your expectations, or that any errors in the Service will be corrected.</p>
          </div>

          <div className="terms-section">
            <p className="terms-section-title">SECTION 6 - ACCURACY OF BILLING AND ACCOUNT INFORMATION</p>
            <p>We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household or per order. In the event that we make a change to or cancel an order, we may attempt to notify you by contacting the e-mail and/or billing address/phone number provided at the time the order was made.</p>
          </div>

          <div className="terms-section">
            <p className="terms-section-title">SECTION 20 - CONTACT INFORMATION</p>
            <p>Questions about the Terms of Service should be sent to us at <a href="mailto:autostitchsecurity@gmail.com">autostitchsecurity@gmail.com</a>.</p>
          </div>

          <div className="terms-footer-sep">--------------------------------------</div>
        </div>
      </div>
    </div>
  );
}
