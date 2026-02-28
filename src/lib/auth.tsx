import React, { createContext, useContext, useState, useEffect } from 'react';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';

interface AuthContextType {
    user: any | null;
    login: () => void;
    logout: () => void;
    loading: boolean;
    accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Note: For a real deployment, we check the allowed email from env, but here we'll just sign them in.
    const login = useGoogleLogin({
        onSuccess: (codeResponse) => {
            setAccessToken(codeResponse.access_token);
            // Fetch user info using the access token
            fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${codeResponse.access_token}`, {
                headers: {
                    Authorization: `Bearer ${codeResponse.access_token}`,
                    Accept: 'application/json'
                }
            })
                .then((res) => res.json())
                .then((res) => {
                    setUser(res);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error("Failed to fetch user info", err);
                    setLoading(false);
                });
        },
        onError: (error) => {
            console.log('Login Failed:', error);
            setLoading(false);
        },
        scope: "https://www.googleapis.com/auth/spreadsheets", // Extremely important for the Google Sheets API
    });

    const logout = () => {
        googleLogout();
        setUser(null);
        setAccessToken(null);
    };

    useEffect(() => {
        // Basic session initialization, ideally would try silent refresh or check localStorage
        setLoading(false);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, accessToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
