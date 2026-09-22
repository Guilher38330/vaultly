import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Perfil
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Gerencie as configurações e preferências da sua conta.
                    </p>
                </div>
            }
        >
            <Head title="Profile" />

            <div className="py-8 sm:py-12">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
