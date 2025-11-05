'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface DrawCardProps {
  draw: {
    id: string;
    title: string;
    status: string;
    start_at: string;
    end_at: string;
    ticket_price: number;
    max_tickets: number;
    tickets_sold: number;
    tickets_remaining?: number;
  };
}

export default function DrawCard({ draw }: DrawCardProps) {
  const isOpen = draw.status === 'STARTED';
  const sellThroughPct = (draw.tickets_sold / draw.max_tickets) * 100;
  const endsIn = isOpen ? formatDistanceToNow(new Date(draw.end_at), { addSuffix: true }) : null;

  return (
    <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow bg-white">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{draw.title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isOpen ? `Ends ${endsIn}` : `Status: ${draw.status}`}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {draw.status}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">
            Tickets: {draw.tickets_sold.toLocaleString()} / {draw.max_tickets.toLocaleString()}
          </span>
          <span className="font-medium text-gray-900">{sellThroughPct.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${sellThroughPct}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-2xl font-bold text-gray-900">৳{draw.ticket_price}</p>
          <p className="text-xs text-gray-500">per ticket</p>
        </div>
        {isOpen && (
          <Link
            href={`/buy/${draw.id}`}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Buy Now
          </Link>
        )}
      </div>
    </div>
  );
}
