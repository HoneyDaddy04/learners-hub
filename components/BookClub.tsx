import React, { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Calendar, MessageSquare, ExternalLink, Plus, Trash2, X, Archive } from 'lucide-react';
import { UserRole, Book } from '../types';

interface BookCardProps {
  book: Book;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, isAdmin, onDelete }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-200 flex space-x-4 relative group">
      <img src={book.coverUrl} alt={book.title} className="w-16 h-24 object-cover rounded shadow-sm flex-shrink-0" />
      <div className="flex-1">
          <h4 className="font-bold text-gray-900">{book.title}</h4>
          <p className="text-xs text-gray-500 mb-2">{book.author}</p>
          <div className="text-xs text-gray-500 flex items-center mb-1">
          <Calendar className="w-3 h-3 mr-1" />
          {book.status === 'Upcoming' ? 'Planned:' : 'Discussed:'} {book.discussionDate}
          </div>
          <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded ${
              book.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
          }`}>
              {book.status}
          </span>
      </div>
      {isAdmin && (
          <button 
              onClick={() => onDelete(book.id)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
              <Trash2 className="w-4 h-4" />
          </button>
      )}
  </div>
);

const BookClub: React.FC = () => {
  const { books, currentUser, addBook, deleteBook } = useStore();
  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;
  
  const currentBook = books.find(b => b.status === 'Current');
  const upcomingBooks = books.filter(b => b.status === 'Upcoming');
  const pastBooks = books.filter(b => b.status === 'Archived');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBook, setNewBook] = useState<Partial<Book>>({
    title: '', author: '', coverUrl: '', discussionDate: '', description: '', status: 'Upcoming'
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBook.title && newBook.author) {
      addBook({
        title: newBook.title!,
        author: newBook.author!,
        coverUrl: newBook.coverUrl || 'https://via.placeholder.com/150',
        discussionDate: newBook.discussionDate!,
        description: newBook.description || '',
        status: newBook.status as any,
        slackThreadUrl: ''
      });
      setIsModalOpen(false);
      setNewBook({ title: '', author: '', coverUrl: '', discussionDate: '', description: '', status: 'Upcoming' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold text-gray-900">Engineering Book Club</h1>
            <p className="mt-1 text-sm text-gray-500">Join the discussion on technical literature.</p>
         </div>
         {isAdmin && (
           <button 
             onClick={() => setIsModalOpen(true)}
             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center shadow-sm"
           >
             <Plus className="w-4 h-4 mr-2" />
             Add Book
           </button>
         )}
      </div>

      {/* Current Selection */}
      {currentBook ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row relative">
           {isAdmin && (
             <button 
               onClick={() => { if(window.confirm('Delete this book?')) deleteBook(currentBook.id); }}
               className="absolute top-4 right-4 text-gray-400 hover:text-red-500 bg-white rounded-full p-1"
             >
               <Trash2 className="w-5 h-5" />
             </button>
           )}
           <div className="md:w-48 bg-gray-100 flex items-center justify-center p-4">
              <img src={currentBook.coverUrl} alt={currentBook.title} className="h-40 object-cover shadow-lg rounded" />
           </div>
           <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                 <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded mb-2">Current Read</span>
                 <h2 className="text-xl font-bold text-gray-900">{currentBook.title}</h2>
                 <p className="text-gray-600 font-medium">{currentBook.author}</p>
                 <p className="text-gray-500 mt-2 text-sm">{currentBook.description}</p>
              </div>
              <div className="mt-6 flex items-center space-x-4">
                 <div className="flex items-center text-sm text-gray-700">
                    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                    Discussion: {currentBook.discussionDate}
                 </div>
                 {currentBook.slackThreadUrl && (
                   <a href="#" className="flex items-center text-sm text-blue-600 hover:underline">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View Slack Thread
                   </a>
                 )}
              </div>
           </div>
        </div>
      ) : (
          <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">No book currently selected for reading.</p>
          </div>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                Upcoming Books
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs py-0.5 px-2 rounded-full">{upcomingBooks.length}</span>
            </h3>
            <div className="space-y-4">
                {upcomingBooks.length > 0 ? upcomingBooks.map(book => (
                  <BookCard key={book.id} book={book} isAdmin={isAdmin} onDelete={deleteBook} />
                )) : (
                    <p className="text-sm text-gray-400 italic">No upcoming books scheduled.</p>
                )}
            </div>
          </div>

          {/* Past */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Archive className="w-4 h-4 mr-2 text-gray-500" />
                Archive
            </h3>
            <div className="space-y-4">
                {pastBooks.length > 0 ? pastBooks.map(book => (
                  <BookCard key={book.id} book={book} isAdmin={isAdmin} onDelete={deleteBook} />
                )) : (
                    <p className="text-sm text-gray-400 italic">No past books.</p>
                )}
            </div>
          </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add Book Entry</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Book Title</label>
                 <input required type="text" className="w-full border rounded-lg p-2" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                 <input required type="text" className="w-full border rounded-lg p-2" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Cover URL</label>
                 <input type="text" className="w-full border rounded-lg p-2" value={newBook.coverUrl} onChange={e => setNewBook({...newBook, coverUrl: e.target.value})} placeholder="https://..." />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                 <input required type="date" className="w-full border rounded-lg p-2" value={newBook.discussionDate} onChange={e => setNewBook({...newBook, discussionDate: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                 <select className="w-full border rounded-lg p-2" value={newBook.status} onChange={e => setNewBook({...newBook, status: e.target.value as any})}>
                   <option value="Upcoming">Upcoming</option>
                   <option value="Current">Current</option>
                   <option value="Archived">Archived</option>
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                 <textarea className="w-full border rounded-lg p-2" rows={3} value={newBook.description} onChange={e => setNewBook({...newBook, description: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-4">Add Book</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookClub;