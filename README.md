A Multifactor Authentication System

The component implements a dual-panel authentication form (sign-in and sign-up) with support for OTP (One-Time Password) and WebAuthn-based passkey authentication. It features animated UI transitions, responsive design, and integrates with server-side actions for user management.

Overview
The AuthForm is a client-side React component built with Next.js. It renders a visually appealing authentication interface with neon-style animations, allowing users to sign in or sign up using email-based OTP or biometric passkeys. The component handles form validation, API interactions, and state management for a seamless user experience.

Key functionalities:

Dual Panels: Toggle between sign-in and sign-up modes.
Authentication Methods: OTP via email or passkey (WebAuthn).
Responsive Design: Adapts to desktop, tablet, and mobile layouts.
Animations: Uses Framer Motion for rotating neon effects and panel transitions.
Form Validation: Powered by Zod and React Hook Form.
Server Integration: Communicates with backend actions for account creation, sign-in, and passkey management.


UI Rendering
The component renders a full-screen container with a neon-animated frame:
<img width="1144" height="573" alt="Screenshot (1017)" src="https://github.com/user-attachments/assets/4f2fe937-9f43-4263-acfa-8926151b2865" />
<img width="1094" height="596" alt="Screenshot (1014)" src="https://github.com/user-attachments/assets/6e638662-80c1-42be-92df-3c7633be000b" />

Outer Frame: A responsive div with rotating gradient borders for a "neon" effect using Framer Motion.
Inner Container: A gradient background with two panels (sign-in and sign-up) and an overlay.
Panels
Sign-In Panel: Form with email input, OTP/Passkey toggle buttons, and submit button. Includes a link to sign-up.
Sign-Up Panel: Form with full name and email inputs, submit button, and a link to sign-in.
Overlay Panel (Desktop only): Displays promotional text and a toggle button to switch panels.
Responsiveness
Desktop/Tablet: Side-by-side panels with sliding animations.
Mobile: Stacked panels with fade transitions.
Uses Tailwind CSS classes for sizing and positioning
Modal Integration you can view app demo 
<a href="https://mfa-system-nine.vercel.app/sign-in">here<a/>


Key Features and Behaviors
Animations: Continuous rotation of neon borders; smooth panel transitions.
Error Handling: Comprehensive try-catch blocks with user-friendly toasts.
Security: WebAuthn ensures secure, passwordless authentication.
Accessibility: Form labels, error messages, and responsive design.
Customization: Easily extensible for additional auth methods or UI tweaks.
