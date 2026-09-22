import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout
            badge="VERIFICAÇÃO"
            title="Almost there!"
            subtitle="CHECK YOUR INBOX"
            description="Obrigado por se registrar! Verifique a sua caixa de entrada para confirmar o seu endereço de e-mail e desbloquear todos os recursos."
            showcasePosition="right"
        >
            <Head title="Email Verification" />

            <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Verifique seu E-mail
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    Enviamos um link de confirmação para o seu e-mail cadastrado. Clique no link recebido para ativar sua conta.
                </p>
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Um novo link de verificação foi enviado para o endereço de e-mail que você forneceu durante o registro.
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div className="pt-2">
                    <PrimaryButton className="w-full py-3" disabled={processing}>
                        Resend Verification Email
                    </PrimaryButton>
                </div>

                <div className="text-center pt-2">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-700 underline dark:text-zinc-400 dark:hover:text-zinc-200 focus:outline-none"
                    >
                        Log Out
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
