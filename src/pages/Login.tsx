import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '../components/ui/button';

export default function Login() {
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl shadow-lg border border-border">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-foreground">
                        Budget Ledger
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to access your financial insights
                    </p>
                </div>
                <div className="flex justify-center flex-col gap-4">
                    <Button onClick={() => login()} className="w-full" size="lg">
                        Sign In with Google
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-4">
                        Secured by Google Identity. Your data is stored strictly in your personal Google Drive.
                    </p>
                </div>
            </div>
        </div>
    );
}
