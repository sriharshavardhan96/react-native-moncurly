<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into MonCurrly, a React Native Expo subscription management app.

## Changes made

- **`app.config.js`** (new): Extends `app.json` with PostHog `extra` config, reading `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` from environment variables via `expo-constants`.
- **`lib/posthog.ts`** (new): Initialises the `PostHog` client singleton using `expo-constants` to read token/host from `app.config.js` extras. Disables itself gracefully when no token is configured.
- **`.env`** (updated): `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` added (covered by `.gitignore`).
- **`app/_layout.tsx`**: Added `PostHogProvider` wrapping the entire app. Restored and activated the commented-out screen tracking code using `posthog.screen()` on every pathname change with sanitised params.
- **`app/(auth)/sign-in.tsx`**: Added `usePostHog` hook; captures `user_signed_in` (with `posthog.identify()`), `user_sign_in_failed`, and `user_mfa_code_sent`.
- **`app/(auth)/sign-up.tsx`**: Added `usePostHog` hook; captures `user_signed_up` (with `posthog.identify()` including `first_sign_up_date`) and `user_sign_up_failed`.
- **`app/(tabs)/settings.tsx`**: Added `usePostHog` hook; captures `user_signed_out` and calls `posthog.reset()` before signing out to clear the identity.
- **`app/(tabs)/index.tsx`**: Added `usePostHog` hook; captures `subscription_expanded` with `subscription_id` when a card is expanded (not collapsed).
- **`app/subscriptions/[id].tsx`**: Added `usePostHog` hook; captures `subscription_details_viewed` with `subscription_id` on mount.

## Events instrumented

| Event | Description | File |
|---|---|---|
| `user_signed_in` | User successfully signs in via Clerk (password or MFA). Calls `posthog.identify()`. | `app/(auth)/sign-in.tsx` |
| `user_sign_in_failed` | Sign-in attempt failed (wrong credentials or MFA error). Includes `reason` property. | `app/(auth)/sign-in.tsx` |
| `user_mfa_code_sent` | MFA email verification code sent during sign-in. | `app/(auth)/sign-in.tsx` |
| `user_signed_up` | New account successfully created and email verified. Calls `posthog.identify()` with `first_sign_up_date`. | `app/(auth)/sign-up.tsx` |
| `user_sign_up_failed` | Account creation failed (password or finalize error). Includes `reason` property. | `app/(auth)/sign-up.tsx` |
| `user_signed_out` | User signs out from the Settings screen. Calls `posthog.reset()`. | `app/(tabs)/settings.tsx` |
| `subscription_expanded` | User taps to expand a subscription card on the home screen. Includes `subscription_id`. | `app/(tabs)/index.tsx` |
| `subscription_details_viewed` | User views the full subscription detail page. Includes `subscription_id`. | `app/subscriptions/[id].tsx` |

## Next steps

We've built a dashboard and five insights for you to monitor user behaviour:

- **Dashboard**: [Analytics basics](https://us.posthog.com/project/382897/dashboard/1469973)
- **Sign-up & Sign-in Conversion Funnel**: [View insight](https://us.posthog.com/project/382897/insights/S0KgB2Ac)
- **Daily Sign-ins & Sign-ups**: [View insight](https://us.posthog.com/project/382897/insights/3dNRlOjp)
- **Auth Error Rate**: [View insight](https://us.posthog.com/project/382897/insights/0t3ftvKX)
- **User Churn — Sign-outs**: [View insight](https://us.posthog.com/project/382897/insights/0sWxfU7j)
- **Subscription Engagement**: [View insight](https://us.posthog.com/project/382897/insights/aiiohd1y)

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
