import React, { useState } from 'react';
import HealthArticlesTab from '../components/content/HealthArticlesTab';
import FirstAidContentTab from '../components/content/FirstAidContentTab';
import EmergencyContentTab from '../components/content/EmergencyContentTab';

const CONTENT_TABS = [
    { id: 'articles', label: 'Articles' },
    { id: 'first-aid', label: 'First Aid' },
    { id: 'emergency', label: 'Emergency' },
];

export default function Content() {
    const [activeTab, setActiveTab] = useState('articles');

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                    Content Management
                </h1>
                <p className="text-brand-gold mt-1 font-medium">
                    Manage health articles, first aid guides, and emergency content
                </p>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-border pb-1">
                {CONTENT_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                            activeTab === tab.id
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'articles' && <HealthArticlesTab />}
            {activeTab === 'first-aid' && <FirstAidContentTab />}
            {activeTab === 'emergency' && <EmergencyContentTab />}
        </div>
    );
}
