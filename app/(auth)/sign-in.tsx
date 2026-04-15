import { useSignIn } from '@clerk/expo';
import { Link, useRouter, type Href } from 'expo-router';
import { styled } from 'nativewind';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

const SafeAreaView = styled(RNSafeAreaView);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeCode = (value: string) => value.replace(/\D/g, '').slice(0, 6);

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

const SignIn = () => {
    const { signIn, errors, fetchStatus } = useSignIn();
    const router = useRouter();

    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [needsEmailCode, setNeedsEmailCode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [localErrors, setLocalErrors] = useState<Record<string, string | undefined>>({});

    const isBusy = fetchStatus === 'fetching';
    const email = normalizeEmail(emailAddress);

    const remoteErrors = useMemo(
        () => ({
            emailAddress: getFieldError(errors.fields, ['identifier', 'emailAddress', 'email_address']),
            password: getFieldError(errors.fields, ['password']),
            code: getFieldError(errors.fields, ['code']),
            general: getErrorMessage(errors),
        }),
        [errors]
    );

    const finalizeSignIn = async () => {
        const { error } = await signIn.finalize();

        if (error) {
            setLocalErrors((current) => ({
                ...current,
                general: getErrorMessage(error) ?? 'We could not finish signing you in. Please try again.',
            }));
            return;
        }

        router.replace('/(tabs)' as Href);
    };

    const handleSubmit = async () => {
        const nextErrors: Record<string, string | undefined> = {};

        if (!email) {
            nextErrors.emailAddress = 'Enter your email address.';
        } else if (!emailPattern.test(email)) {
            nextErrors.emailAddress = 'Enter a valid email address.';
        }

        if (!password) {
            nextErrors.password = 'Enter your password.';
        }

        setLocalErrors(nextErrors);
        if (Object.values(nextErrors).some(Boolean)) return;

        const { error } = await signIn.password({
            emailAddress: email,
            password,
        });

        if (error) {
            setLocalErrors((current) => ({
                ...current,
                general: getErrorMessage(error) ?? 'We could not sign you in. Check your details and try again.',
            }));
            return;
        }

        if (signIn.status === 'complete') {
            await finalizeSignIn();
            return;
        }

        if (signIn.status === 'needs_client_trust') {
            const emailCodeFactor = signIn.supportedSecondFactors.find(
                (factor) => factor.strategy === 'email_code'
            );

            if (emailCodeFactor) {
                const { error: sendCodeError } = await signIn.mfa.sendEmailCode();

                if (sendCodeError) {
                    setLocalErrors((current) => ({
                        ...current,
                        general: getErrorMessage(sendCodeError) ?? 'We could not send a verification code. Please try again.',
                    }));
                    return;
                }

                setNeedsEmailCode(true);
                setCode('');
                setLocalErrors({});
                return;
            }
        }

        setLocalErrors((current) => ({
            ...current,
            general: 'Additional verification is required for this account.',
        }));
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

        const { error } = await signIn.mfa.verifyEmailCode({ code: normalizedCode });

        if (error) {
            setLocalErrors((current) => ({
                ...current,
                code: getErrorMessage(error) ?? 'That code did not work. Please try again.',
                general: undefined,
            }));
            return;
        }

        if (signIn.status === 'complete') {
            await finalizeSignIn();
            return;
        }

        setLocalErrors((current) => ({
            ...current,
            general: 'Verification succeeded, but sign-in is not complete yet.',
        }));
    };

    const handleResendCode = async () => {
        const { error } = await signIn.mfa.sendEmailCode();

        if (error) {
            setLocalErrors((current) => ({
                ...current,
                general: getErrorMessage(error) ?? 'We could not send a new code. Please try again.',
            }));
        }
    };

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
                            <Text className="auth-title">{needsEmailCode ? 'Verify your identity' : 'Welcome back'}</Text>
                            <Text className="auth-subtitle">
                                {needsEmailCode
                                    ? 'We sent a verification code to your email'
                                    : 'Sign in to continue managing your subscriptions'}
                            </Text>
                        </View>

                        <View className="auth-card">
                            <View className="auth-form">
                                {needsEmailCode ? (
                                    <>
                                        <View className="auth-field">
                                            <Text className="auth-label">Verification Code</Text>
                                            <TextInput
                                                className={`auth-input ${localErrors.code || remoteErrors.code ? 'auth-input-error' : ''}`}
                                                value={code}
                                                placeholder="Enter 6-digit code"
                                                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                                onChangeText={(value) => setCode(normalizeCode(value))}
                                                autoCapitalize="none"
                                                autoCorrect={false}
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
                                                <Text className="auth-button-text">Verify</Text>
                                            )}
                                        </Pressable>

                                        <Pressable
                                            className="auth-secondary-button"
                                            onPress={handleResendCode}
                                            disabled={isBusy}
                                        >
                                            <Text className="auth-secondary-button-text">Resend Code</Text>
                                        </Pressable>

                                        <Pressable
                                            className="auth-secondary-button"
                                            onPress={() => {
                                                setNeedsEmailCode(false);
                                                setCode('');
                                                setLocalErrors({});
                                            }}
                                            disabled={isBusy}
                                        >
                                            <Text className="auth-secondary-button-text">Back to sign in</Text>
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
                                                placeholder="Enter your password"
                                                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                                secureTextEntry={!showPassword}
                                                onChangeText={setPassword}
                                                autoComplete="password"
                                            />
                                            {(localErrors.password || remoteErrors.password) ? (
                                                <Text className="auth-error">{localErrors.password || remoteErrors.password}</Text>
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
                                                <Text className="auth-button-text">Sign In</Text>
                                            )}
                                        </Pressable>
                                    </>
                                )}
                            </View>
                        </View>

                        {!needsEmailCode ? (
                            <View className="auth-link-row">
                                <Text className="auth-link-copy">Don&apos;t have an account?</Text>
                                <Link href="/(auth)/sign-up" asChild>
                                    <Pressable>
                                        <Text className="auth-link">Create Account</Text>
                                    </Pressable>
                                </Link>
                            </View>
                        ) : null}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignIn;
