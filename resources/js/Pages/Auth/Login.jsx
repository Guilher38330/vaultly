import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { EmailIcon, LockIcon } from '@/Components/Icons';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout
            badge="PORTAL DE ACESSO"
            title="Hello!"
            subtitle="HAVE A GOOD DAY"
            description="Seja bem-vindo de volta! Acesse sua conta para continuar sua jornada pelo universo digital."
        >
            <Head title="Log in" />

            <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Entrar na Conta
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    Insira suas credenciais para acessar a plataforma.
                </p>
            </div>

            {status && (
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {status}
                </div>
            )}

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
                            isFocused={true}
                            placeholder="exemplo@dominio.com"
                            icon={<EmailIcon className="h-5 w-5" />}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </div>

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Senha de Acesso" />

                    <div className="mt-1.5">
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="w-full"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            icon={<LockIcon className="h-5 w-5" />}
                            showPasswordToggle={true}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                    </div>

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <label className="flex cursor-pointer items-center select-none py-1">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData('remember', e.target.checked)
                            }
                        />
                        <span className="ms-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Lembrar de mim
                        </span>
                    </label>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 hover:underline focus:outline-none dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                            Esqueceu a senha?
                        </Link>
                    )}
                </div>

                <div className="pt-2">
                    <PrimaryButton className="w-full py-3" disabled={processing}>
                        Log in
                    </PrimaryButton>
                </div>
            </form>

            <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Ainda não tem uma conta?{' '}
                <Link
                    href={route('register')}
                    className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                    Criar nova conta
                </Link>
            </div>
        </GuestLayout>
    );
}
