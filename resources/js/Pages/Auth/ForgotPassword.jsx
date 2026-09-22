import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { ArrowLeftIcon, EmailIcon } from '@/Components/Icons';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout
            badge="RECUPERAÇÃO"
            title="Don't worry!"
            subtitle="WE GOT YOUR BACK"
            description="Informe seu e-mail cadastrado e enviaremos um link seguro para você redefinir sua senha de acesso."
        >
            <Head title="Forgot Password" />

            <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Recuperar Senha
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    Esqueceu sua senha? Sem problemas. Digite seu endereço de e-mail abaixo.
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
                            isFocused={true}
                            placeholder="exemplo@dominio.com"
                            icon={<EmailIcon className="h-5 w-5" />}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </div>

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="pt-2">
                    <PrimaryButton className="w-full py-3" disabled={processing}>
                        Email Password Reset Link
                    </PrimaryButton>
                </div>
            </form>

            <div className="mt-6 text-center">
                <Link
                    href={route('login')}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-500 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                    <ArrowLeftIcon className="h-3.5 w-3.5" />
                    Voltar para o Login
                </Link>
            </div>
        </GuestLayout>
    );
}
