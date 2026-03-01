import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '../components/ui/button';
import videoUrl from '/Vintage_Document_Organization_Video.mp4';

export default function Login() {
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    return (
        <div className="relative flex h-screen w-full items-center justify-center px-4 overflow-hidden">
            {/* Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover z-0 filter brightness-[0.3]"
            >
                <source src={videoUrl} type="video/mp4" />
            </video>

            {/* Foreground Login Card */}
            <div className="relative z-10 w-full max-w-md space-y-8 bg-card/95 backdrop-blur shadow-2xl p-8 rounded-xl border border-border">
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
