import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import PasswordStrengthMeter from '@/Components/PasswordStrengthMeter';
import { EmailIcon, LockIcon } from '@/Components/Icons';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout
            badge="NOVA SENHA"
            title="Security first!"
            subtitle="UPDATE YOUR ACCESS"
            description="Defina uma nova senha forte para manter sua conta protegida e reestabelecer seu acesso."
            showcasePosition="right"
        >
            <Head title="Reset Password" />

            <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Redefinir Senha
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    Crie uma nova credencial para proteger sua conta.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="email" value="Endereço de E-mail" />

                    <div className="mt-1.5">
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="w-full"
                            autoComplete="username"
                            icon={<EmailIcon className="h-5 w-5" />}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </div>

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Nova Senha" />

                    <div className="mt-1.5">
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="w-full"
                            autoComplete="new-password"
                            isFocused={true}
                            placeholder="Mínimo 8 caracteres"
                            icon={<LockIcon className="h-5 w-5" />}
                            showPasswordToggle={true}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                    </div>

                    {/* Password Strength Indicator */}
                    <PasswordStrengthMeter password={data.password} />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirmar Nova Senha"
                    />

                    <div className="mt-1.5">
                        <TextInput
                            type="password"
                            id="password_confirmation"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="w-full"
                            autoComplete="new-password"
                            placeholder="Repita sua nova senha"
                            icon={<LockIcon className="h-5 w-5" />}
                            showPasswordToggle={true}
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                        />
                    </div>

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <div className="pt-2">
                    <PrimaryButton className="w-full py-3" disabled={processing}>
                        Reset Password
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
