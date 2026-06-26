import React from 'react';
import HealthArticlesTab from '../components/content/HealthArticlesTab';

export default function Content() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Content Management</h1>
                <p className="text-brand-gold mt-1 font-medium">Manage health articles</p>
                 
            </div>
            <HealthArticlesTab />
        </div>
    );
}
