'use client';

import { useRouter } from 'next/navigation';

export default function StartBuildingCard() {
  const router = useRouter();

  return (
    <div className="bg-gradient-to-br from-indigo-500/10 via-slate-500/5 to-stone-500/10 border border-stone-200 rounded-2xl p-8 text-center max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h2 className="text-2xl font-semibold text-stone-900 mb-2">
          Welcome to Volcity!
        </h2>

        <p className="text-stone-600 text-lg mb-6 max-w-md mx-auto">
          Let&apos;s build your first business. It takes about 2 minutes — the AI will handle the hard parts.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => router.push('/builder')}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm"
        >
          Start Building →
        </button>

        <button
          onClick={() => {
            const mentorInput = document.querySelector('textarea') as HTMLTextAreaElement | null;
            if (mentorInput) {
              mentorInput.value = "I'm not sure what kind of business to build. Can you help me figure out what I should create?";
              mentorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTimeout(() => mentorInput.focus(), 500);
            }
          }}
          className="px-6 py-3 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl font-medium transition-colors"
        >
          Not sure what to build?
        </button>
      </div>

      <p className="text-xs text-stone-500 mt-6">
        You can always come back and edit anything later
      </p>
    </div>
  );
}
