import React, { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Hash, ExternalLink, MessageCircle } from 'lucide-react';

const ActivityFeed: React.FC<{ activities: any[] }> = () => {
  const { activities } = useStore();
  const [filter, setFilter] = useState<'All' | 'Channels'>('All');

  // Filter out system logs if we only want feed posts, or mix them. 
  // Let's focus on showing 'post' types clearly as feed items.
  const feedItems = activities.filter(a => a.type === 'post' || a.type === 'create');
  
  // Group logic or display as flat feed. Flat feed for Slack style.

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning Feed</h1>
          <p className="mt-1 text-sm text-gray-500">Latest discussions from #ai-learnings, #random, and more.</p>
        </div>
        <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
          <button 
            onClick={() => setFilter('All')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'All' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            All
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {feedItems.map((item, index) => (
          <div key={item.id || index} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start">
              <img 
                src={item.userAvatar} 
                alt={item.userName} 
                className="w-10 h-10 rounded-md"
              />
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="font-bold text-gray-900">{item.userName}</span>
                    <span className="text-xs text-gray-500 ml-2">{item.timestamp}</span>
                  </div>
                  {item.channel && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      <Hash className="w-3 h-3 mr-1" />
                      {item.channel.replace('#', '')}
                    </span>
                  )}
                </div>

                <div className="mt-2 text-gray-800 text-sm leading-relaxed">
                  {item.content || (
                    <span>
                      {item.action} <span className="font-semibold">{item.target}</span>
                    </span>
                  )}
                </div>

                {item.linkUrl && (
                  <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center group cursor-pointer hover:bg-gray-100 transition-colors">
                     <div className="p-2 bg-blue-100 rounded-md text-blue-600 mr-3">
                       <ExternalLink className="w-5 h-5" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700">
                         {item.linkTitle || 'Shared Link'}
                       </h4>
                       <a href={item.linkUrl} className="text-xs text-gray-500 truncate hover:underline block">
                         {item.linkUrl}
                       </a>
                     </div>
                  </div>
                )}
                
                <div className="mt-3 flex items-center space-x-4">
                   <button className="flex items-center text-xs text-gray-500 hover:text-gray-700">
                     <MessageCircle className="w-4 h-4 mr-1" /> Reply
                   </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;