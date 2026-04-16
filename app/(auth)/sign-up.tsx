import { useAuth, useSignUp } from '@clerk/expo';
import { Link, useRouter, type Href } from 'expo-router';
import { styled } from 'nativewind';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { usePostHog } from 'posthog-react-native';

const SafeAreaView = styled(RNSafeAreaView);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const codePattern = /\D/g;

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeCode = (value: string) => value.replace(codePattern, '').slice(0, 6);

const getErrorMessage = (error: unknown) => {
    if (!error || typeof error !== 'object') return undefined;

    const clerkError = error as {
        longMessage?: string;
        message?: string;
        errors?: { longMessage?: string; message?: string }[];
    };

    return clerkError.longMessage ?? clerkError.message ?? clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message;
};

const getFieldError = (
    fields: object | undefined,
    keys: string[]
) => {
    const typedFields = fields as Record<string, { message?: string } | undefined> | undefined;

    for (const key of keys) {
        const message = typedFields?.[key]?.message;
        if (message) return message;
    }

    return undefined;
};

const SignUp = () => {
    const { signUp, errors, fetchStatus } = useSignUp();
    const { isSignedIn, userId } = useAuth();
    const router = useRouter();
    const posthog = usePostHog();

    const [emailAddress, setEmailAddress] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [code, setCode] = useState('');
    const [verificationStep, setVerificationStep] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [localErrors, setLocalErrors] = useState<Record<string, string | undefined>>({});

    const isBusy = fetchStatus === 'fetching';
    const requiresUsername = signUp.requiredFields.includes('username') || signUp.missingFields.includes('username');
    const email = normalizeEmail(emailAddress);
    const isVerifyingEmail =
        verificationStep ||
        (signUp.status === 'missing_requirements' &&
            signUp.unverifiedFields.includes('email_address') &&
            signUp.missingFields.length === 0);

    const remoteErrors = useMemo(
        () => ({
            emailAddress: getFieldError(errors.fields, ['emailAddress', 'email_address']),
            username: getFieldError(errors.fields, ['username']),
            password: getFieldError(errors.fields, ['password']),
            confirmPassword: getFieldError(errors.fields, ['confirmPassword']),
            code: getFieldError(errors.fields, ['code']),
            general: getErrorMessage(errors),
        }),
        [errors]
    );

    const validateForm = () => {
        const nextErrors: Record<string, string | undefined> = {};

        if (!email) {
            nextErrors.emailAddress = 'Enter your email address.';
        } else if (!emailPattern.test(email)) {
            nextErrors.emailAddress = 'Enter a valid email address.';
        }

        if (requiresUsername) {
            const cleanUsername = username.trim();
            if (!cleanUsername) {
                nextErrors.username = 'Enter a username.';
            } else if (!/^[a-zA-Z0-9_.-]{3,}$/.test(cleanUsername)) {
                nextErrors.username = 'Use at least 3 letters, numbers, dots, dashes, or underscores.';
            }
        }

        if (!password) {
            nextErrors.password = 'Create a password.';
        } else if (password.length < 8) {
            nextErrors.password = 'Password must be at least 8 characters.';
        }

        if (!confirmPassword) {
            nextErrors.confirmPassword = 'Confirm your password.';
        } else if (password !== confirmPassword) {
            nextErrors.confirmPassword = 'Passwords do not match.';
        }

        return nextErrors;
    };

    const finishSignUp = async () => {
        if (signUp.status !== 'complete' || !signUp.createdSessionId) {
            const missing = signUp.missingFields.join(', ');
            setLocalErrors((current) => ({
                ...current,
                general: missing
                    ? `Your email is verified, but Clerk still requires: ${missing.replaceAll('_', ' ')}.`
                    : 'Your email is verified, but the account is not ready to sign in yet.',
            }));
            return;
        }

        const { error } = await signUp.finalize();

        if (error) {
            setLocalErrors((current) => ({
                ...current,
                general: getErrorMessage(error) ?? 'We could not finish creating your account. Please try again.',
            }));
            posthog.capture('user_sign_up_failed', { reason: getErrorMessage(error) ?? 'finalize_error' });
            return;
        }

        posthog.identify(userId ?? email, {
            $set: { email },
            $set_once: { first_sign_up_date: new Date().toISOString() },
        });
        posthog.capture('user_signed_up', { method: 'password' });
        router.replace('/(tabs)' as Href);
    };

    const handleSubmit = async () => {
        const nextErrors = validateForm();
        setLocalErrors(nextErrors);

        if (Object.values(nextErrors).some(Boolean)) return;

        const signUpPayload = {
            emailAddress: email,
            password,
            ...(requiresUsername ? { username: username.trim() } : {}),
        };

        const { error: passwordError } = await signUp.password(signUpPayload as Parameters<typeof signUp.password>[0]);

        if (passwordError) {
            setLocalErrors((current) => ({
                ...current,
                general: getErrorMessage(passwordError) ?? 'We could not create your account. Please try again.',
            }));
            posthog.capture('user_sign_up_failed', { reason: getErrorMessage(passwordError) ?? 'password_error' });
            return;
        }

        const { error: sendCodeError } = await signUp.verifications.sendEmailCode();

        if (sendCodeError) {
            setLocalErrors((current) => ({
                ...current,
                general: getErrorMessage(sendCodeError) ?? 'We could not send the verification code. Please try again.',
            }));
            return;
        }

        setCode('');
        setVerificationStep(true);
        setLocalErrors({});
    };

    const handleVerify = async () => {
        const normalizedCode = normalizeCode(code);

        if (normalizedCode.length !== 6) {
            setLocalErrors((current) => ({
                ...current,
                code: 'Enter the 6-digit verification code.',
                general: undefined,
            }));
            return;
        }

        const { error } = await signUp.verifications.verifyEmailCode({
            code: normalizedCode,
        });

        if (error) {
            setLocalErrors((current) => ({
                ...current,
                code: getErrorMessage(error) ?? 'That code did not work. Please try again.',
                general: undefined,
            }));
            return;
        }

        await finishSignUp();
    };

    const handleResendCode = async () => {
        const { error } = await signUp.verifications.sendEmailCode();

        if (error) {
            setLocalErrors((current) => ({
                ...current,
                general: getErrorMessage(error) ?? 'We could not send a new code. Please try again.',
            }));
        }
    };

    if (isSignedIn) return null;

    return (
        <SafeAreaView className="auth-safe-area">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="auth-screen"
            >
                <ScrollView
                    className="auth-scroll"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="auth-content">
                        <View className="auth-brand-block">
                            <View className="auth-logo-wrap">
                                <View className="auth-logo-mark">
                                    <Text className="auth-logo-mark-text">MC</Text>
                                </View>
                                <View>
                                    <Text className="auth-wordmark">MonCurrly</Text>
                                    <Text className="auth-wordmark-sub">SUBSCRIPTIONS</Text>
                                </View>
                            </View>
                            <Text className="auth-title">{isVerifyingEmail ? 'Verify your email' : 'Create your account'}</Text>
                            <Text className="auth-subtitle">
                                {isVerifyingEmail
                                    ? `We sent a verification code to ${email}`
                                    : 'Start tracking your subscriptions and never miss a payment'}
                            </Text>
                        </View>

                        <View className="auth-card">
                            <View className="auth-form">
                                {isVerifyingEmail ? (
                                    <>
                                        <View className="auth-field">
                                            <Text className="auth-label">Verification Code</Text>
                                            <TextInput
                                                className={`auth-input ${localErrors.code || remoteErrors.code ? 'auth-input-error' : ''}`}
                                                value={code}
                                                placeholder="Enter 6-digit code"
                                                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                                onChangeText={(value) => setCode(normalizeCode(value))}
                                                keyboardType="number-pad"
                                                autoComplete="one-time-code"
                                                maxLength={6}
                                            />
                                            {(localErrors.code || remoteErrors.code) ? (
                                                <Text className="auth-error">{localErrors.code || remoteErrors.code}</Text>
                                            ) : null}
                                        </View>

                                        {(localErrors.general || remoteErrors.general) ? (
                                            <Text className="auth-error">{localErrors.general || remoteErrors.general}</Text>
                                        ) : null}

                                        <Pressable
                                            className={`auth-button ${(!code || isBusy) && 'auth-button-disabled'}`}
                                            onPress={handleVerify}
                                            disabled={!code || isBusy}
                                        >
                                            {isBusy ? (
                                                <ActivityIndicator color="#081126" />
                                            ) : (
                                                <Text className="auth-button-text">Verify Email</Text>
                                            )}
                                        </Pressable>

                                        <Pressable
                                            className="auth-secondary-button"
                                            onPress={handleResendCode}
                                            disabled={isBusy}
                                        >
                                            <Text className="auth-secondary-button-text">Resend Code</Text>
                                        </Pressable>
                                    </>
                                ) : (
                                    <>
                                        <View className="auth-field">
                                            <Text className="auth-label">Email Address</Text>
                                            <TextInput
                                                className={`auth-input ${localErrors.emailAddress || remoteErrors.emailAddress ? 'auth-input-error' : ''}`}
                                                autoCapitalize="none"
                                                value={emailAddress}
                                                placeholder="name@example.com"
                                                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                                onChangeText={setEmailAddress}
                                                keyboardType="email-address"
                                                autoComplete="email"
                                            />
                                            {(localErrors.emailAddress || remoteErrors.emailAddress) ? (
                                                <Text className="auth-error">{localErrors.emailAddress || remoteErrors.emailAddress}</Text>
                                            ) : null}
                                        </View>

                                        {requiresUsername ? (
                                            <View className="auth-field">
                                                <Text className="auth-label">Username</Text>
                                                <TextInput
                                                    className={`auth-input ${localErrors.username || remoteErrors.username ? 'auth-input-error' : ''}`}
                                                    autoCapitalize="none"
                                                    value={username}
                                                    placeholder="Choose a username"
                                                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                                    onChangeText={setUsername}
                                                    autoComplete="username"
                                                />
                                                {(localErrors.username || remoteErrors.username) ? (
                                                    <Text className="auth-error">{localErrors.username || remoteErrors.username}</Text>
                                                ) : (
                                                    <Text className="auth-helper">Required by your sign-up settings.</Text>
                                                )}
                                            </View>
                                        ) : null}

                                        <View className="auth-field">
                                            <View className="auth-label-row">
                                                <Text className="auth-label">Password</Text>
                                                <Pressable onPress={() => setShowPassword((current) => !current)} hitSlop={8}>
                                                    <Text className="auth-field-action">{showPassword ? 'Hide' : 'Show'}</Text>
                                                </Pressable>
                                            </View>
                                            <TextInput
                                                className={`auth-input ${localErrors.password || remoteErrors.password ? 'auth-input-error' : ''}`}
                                                value={password}
                                                placeholder="Create a strong password"
                                                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                                secureTextEntry={!showPassword}
                                                onChangeText={setPassword}
                                                autoComplete="password-new"
                                            />
                                            {(localErrors.password || remoteErrors.password) ? (
                                                <Text className="auth-error">{localErrors.password || remoteErrors.password}</Text>
                                            ) : (
                                                <Text className="auth-helper">Minimum 8 characters required</Text>
                                            )}
                                        </View>

                                        <View className="auth-field">
                                            <View className="auth-label-row">
                                                <Text className="auth-label">Confirm Password</Text>
                                                <Pressable onPress={() => setShowConfirmPassword((current) => !current)} hitSlop={8}>
                                                    <Text className="auth-field-action">{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                                                </Pressable>
                                            </View>
                                            <TextInput
                                                className={`auth-input ${localErrors.confirmPassword || remoteErrors.confirmPassword ? 'auth-input-error' : ''}`}
                                                value={confirmPassword}
                                                placeholder="Re-enter your password"
                                                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                                secureTextEntry={!showConfirmPassword}
                                                onChangeText={setConfirmPassword}
                                                autoComplete="password-new"
                                            />
                                            {(localErrors.confirmPassword || remoteErrors.confirmPassword) ? (
                                                <Text className="auth-error">{localErrors.confirmPassword || remoteErrors.confirmPassword}</Text>
                                            ) : null}
                                        </View>

                                        {(localErrors.general || remoteErrors.general) ? (
                                            <Text className="auth-error">{localErrors.general || remoteErrors.general}</Text>
                                        ) : null}

                                        <Pressable
                                            className={`auth-button ${isBusy && 'auth-button-disabled'}`}
                                            onPress={handleSubmit}
                                            disabled={isBusy}
                                        >
                                            {isBusy ? (
                                                <ActivityIndicator color="#081126" />
                                            ) : (
                                                <Text className="auth-button-text">Create Account</Text>
                                            )}
                                        </Pressable>
                                    </>
                                )}
                            </View>
                        </View>

                        {!isVerifyingEmail ? (
                            <View className="auth-link-row">
                                <Text className="auth-link-copy">Already have an account?</Text>
                                <Link href="/(auth)/sign-in" asChild>
                                    <Pressable>
                                        <Text className="auth-link">Sign In</Text>
                                    </Pressable>
                                </Link>
                            </View>
                        ) : null}

                        <View nativeID="clerk-captcha" />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignUp;
