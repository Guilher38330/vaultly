import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import PasswordStrengthMeter from '@/Components/PasswordStrengthMeter';
import { EmailIcon, LockIcon, UserIcon } from '@/Components/Icons';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout
            badge="NOVO ACESSO"
            title="Welcome!"
            subtitle="START YOUR JOURNEY"
            description="Crie sua conta em poucos segundos e comece sua jornada com segurança de ponta a ponta."
            showcasePosition="right"
        >
            <Head title="Register" />

            <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Criar Conta
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    Preencha o formulário para fazer parte da comunidade.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="name" value="Nome Completo" />

                    <div className="mt-1.5">
                        <TextInput
                            id="name"
                            name="name"
                            value={data.name}
                            className="w-full"
                            autoComplete="name"
                            isFocused={true}
                            placeholder="Seu nome"
                            icon={<UserIcon className="h-5 w-5" />}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                    </div>

                    <InputError message={errors.name} className="mt-2" />
                </div>

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
                            placeholder="exemplo@dominio.com"
                            icon={<EmailIcon className="h-5 w-5" />}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                    </div>

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Senha" />

                    <div className="mt-1.5">
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="w-full"
                            autoComplete="new-password"
                            placeholder="Mínimo 8 caracteres"
                            icon={<LockIcon className="h-5 w-5" />}
                            showPasswordToggle={true}
                            onChange={(e) => setData('password', e.target.value)}
                            required
                        />
                    </div>

                    {/* Password Strength Indicator */}
                    <PasswordStrengthMeter password={data.password} />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirmar Senha"
                    />

                    <div className="mt-1.5">
                        <TextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="w-full"
                            autoComplete="new-password"
                            placeholder="Repita sua senha"
                            icon={<LockIcon className="h-5 w-5" />}
                            showPasswordToggle={true}
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            required
                        />
                    </div>

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <div className="pt-2">
                    <PrimaryButton className="w-full py-3" disabled={processing}>
                        Register
                    </PrimaryButton>
                </div>
            </form>

            <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Já possui uma conta?{' '}
                <Link
                    href={route('login')}
                    className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                    Fazer login
                </Link>
            </div>
        </GuestLayout>
    );
}
