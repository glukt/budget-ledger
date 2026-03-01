import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function Login() {
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Budget Ledger</CardTitle>
                    <CardDescription>Sign in to securely access your data</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center flex-col gap-4">
                    <Button onClick={() => login()} className="w-full" size="lg">
                        Sign In with Google
                    </Button>
                    <p className="text-xs text-center text-gray-500 mt-4">
                        Secured by Google Identity. Your data is stored strictly in your personal Google Drive.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
