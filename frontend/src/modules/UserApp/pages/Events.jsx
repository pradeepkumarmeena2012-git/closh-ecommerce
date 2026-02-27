import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';

const Events = () => {
    const navigate = useNavigate();

    const events = [
        {
            id: 1,
            title: 'Flash Sale Weekend',
            description: 'Up to 70% off on top brands. Limited time only!',
            date: 'Coming Soon',
            time: 'All Day',
            location: 'Online',
            image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&auto=format&fit=crop',
            status: 'upcoming',
            badge: 'UPCOMING',
        },
        {
            id: 2,
            title: 'New Collection Launch',
            description: 'Discover the latest summer collection from our top vendors.',
            date: 'Coming Soon',
            time: 'All Day',
            location: 'Online',
            image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop',
            status: 'upcoming',
            badge: 'NEW',
        },
    ];

    return (
        <div className="bg-[#fafafa] min-h-screen pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-white z-40 border-b border-gray-100 px-4 py-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-base font-black uppercase tracking-tight">Events</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Upcoming Events & Sales</p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-2xl">
                <div className="space-y-6">
                    {events.map(event => (
                        <div key={event.id} className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100 group cursor-pointer hover:shadow-xl transition-all duration-300">
                            <div className="relative h-[220px]">
                                <img
                                    src={event.image}
                                    alt={event.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute top-3 left-3">
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                                        event.status === 'upcoming' ? 'bg-amber-400 text-black' : 'bg-gray-600 text-white'
                                    }`}>
                                        {event.badge}
                                    </span>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4">
                                    <h3 className="text-white font-black text-xl tracking-tight mb-1">{event.title}</h3>
                                    <p className="text-white/80 text-[12px] font-medium">{event.description}</p>
                                </div>
                            </div>

                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2 text-[12px] text-gray-500 font-bold">
                                        <Calendar size={14} className="text-gray-400" />
                                        {event.date}
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] text-gray-500 font-bold">
                                        <MapPin size={14} className="text-gray-400" />
                                        {event.location}
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-gray-400" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State if no events */}
                {events.length === 0 && (
                    <div className="py-24 text-center">
                        <Calendar size={48} className="text-gray-200 mx-auto mb-6" />
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">No Events Yet</h3>
                        <p className="text-gray-400 text-sm">Stay tuned for exciting upcoming events!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Events;
