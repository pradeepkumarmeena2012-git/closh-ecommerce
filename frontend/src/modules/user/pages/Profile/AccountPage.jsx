import React from 'react';
import AccountLayout from '../../components/Profile/AccountLayout';

const AccountPage = () => {
    return (
        <AccountLayout isMenuPage={true}>
            <div className="hidden md:flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-2">My Account</h2>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Select an option from the sidebar to manage your account</p>
                </div>
            </div>
        </AccountLayout>
    );
};

export default AccountPage;
