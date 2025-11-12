import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Chat } from "@google/genai";
import './index.css';

type Message = {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  reaction?: string;
  userReaction?: string;
};

type EmojiReply = {
  emoji: string;
  text: string;
};

type ArchivedChat = {
    date: string;
    messages: Message[];
}

const HoneysuckleIcon = () => (
    <svg className="honeysuckle-icon" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
            <radialGradient id="grad-petal" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style={{ stopColor: '#D1E8FF', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#7C5DFA', stopOpacity: 1 }} />
            </radialGradient>
            <radialGradient id="grad-center" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#E9E6FF', stopOpacity: 1 }} />
            </radialGradient>
        </defs>
        <g transform="translate(50,50)">
            {[0, 72, 144, 216, 288].map(angle => (
                 <path
                    key={angle}
                    d="M0 -45 C 20 -30, 20 10, 0 20 C -20 10, -20 -30, 0 -45"
                    fill="url(#grad-petal)"
                    transform={`rotate(${angle})`}
                />
            ))}
        </g>
        <circle cx="50" cy="50" r="12" fill="url(#grad-center)" />
    </svg>
);

const RobotIcon = () => (
  <svg className="honeysuckle-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{color: 'var(--model-message-color)'}}>
    <path d="M19 9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2H9c-1.1 0-2 .9-2 2v2H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2zM9 15v-2h2v2H9zm4 0v-2h2v2h-2zm4 0v-2h2v2h-2z"/>
  </svg>
);

const App = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chat, setChat] = useState<Chat | null>(null);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [hasGreeted, setHasGreeted] = useState(false);
    const [emojiReplies, setEmojiReplies] = useState<EmojiReply[]>([]);
    const [quickReplies, setQuickReplies] = useState<string[]>([]);
    const [reminderTime, setReminderTime] = useState<string | null>(localStorage.getItem('honeysuckle-reminder'));
    const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>(JSON.parse(localStorage.getItem('honeysuckle-archive') || '[]'));

    const chatWindowRef = useRef<HTMLDivElement>(null);
    const isProcessing = useRef(false);

    useEffect(() => {
        async function initChat() {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                const newChat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: `You are HoneysuckleBot, a friendly and empathetic AI assistant from Vietnam. Your purpose is to help students, particularly teenagers, navigate their emotions. You are supportive, non-judgmental, and your goal is to guide them to understand and regulate their feelings in a rich and varied conversational style.
- Start the conversation with a warm, welcoming greeting in Vietnamese.
- Ask how the user is feeling today. Provide emoji options to start: [EMOJI_REPLY: "😊 Vui vẻ", "😢 Buồn", "😠 Tức giận", "😟 Lo lắng", "😐 Bình thường", "😴 Mệt mỏi", "🤯 Căng thẳng", "🤩 Hào hứng"].
- Your responses should be rich and thoughtful, while remaining easy for a teenager to understand. Vary your sentence structure and vocabulary.
- Ask gentle, open-ended questions to encourage the user to reflect on their feelings, like "Điều gì khiến bạn cảm thấy như vậy?" or "Bạn có thể kể thêm về chuyện đó không?".
- Use simple analogies or metaphors to make emotional concepts more relatable. For example, comparing emotions to the weather.
- Adapt your tone to the user's mood: be gentle when they're sad, encouraging when they're anxious, and celebratory when they share good news.
- Based on the user's mood, suggest a simple, positive activity. For example, if they're sad, you might suggest listening to an uplifting song or drawing something. If they're anxious, suggest a short walk or a simple grounding exercise. If they're happy, suggest they write down what's making them feel good.
- Use Vietnamese primarily.
- Hãy ghi nhớ các sở thích và những cuộc trò chuyện trước đây của người dùng. Tham khảo các chi tiết chính như sở thích, những thử thách đã qua hoặc các sự kiện quan trọng để làm cho câu trả lời của bạn trở nên cá nhân hơn và cho thấy bạn đã lắng nghe. Ví dụ, nếu họ đã đề cập đến việc thích chơi guitar, sau này bạn có thể đề nghị, "Có lẽ chơi một bản nhạc guitar có thể giúp bạn cảm thấy tốt hơn vào lúc này."
- When you receive a message like [USER_REACTION: 👍], it means the user reacted to your last message with that emoji. Acknowledge it briefly and naturally (e.g., "Cảm ơn bạn nhé!", "Rất vui vì bạn thấy hữu ích!"), and then seamlessly continue the conversation or wait for their next input.
- Vào những thời điểm thích hợp, hãy đưa ra các gợi ý trả lời nhanh phù hợp với ngữ cảnh để định hướng cuộc trò chuyện và giúp người dùng thể hiện bản thân. Điều này giúp họ nói rõ những suy nghĩ của mình khi họ có thể đang gặp khó khăn. Ví dụ: nếu người dùng nói rằng họ buồn về một bài kiểm tra, bạn có thể gợi ý "Kể cho mình nghe thêm về bài kiểm tra đó", "Bạn có muốn thử một bài tập hít thở không?" hoặc "Có điều gì khác khiến bạn bận tâm không?". Nếu họ cảm thấy lo lắng, bạn có thể gợi ý "Điều gì cụ thể đang làm bạn lo lắng?", "Hãy thử kể ra 3 thứ bạn có thể thấy ngay bây giờ nhé" hoặc "Bạn muốn mình giúp bạn phân tích tình hình không?". Định dạng chúng như sau: [QUICK_REPLY: "Gợi ý 1", "Gợi ý 2", "Gợi ý 3"]. Cung cấp tối đa 4 gợi ý khi cảm thấy tự nhiên.
- Analyze the user's sentiment with nuance and depth. Your emoji reaction should reflect a deeper understanding of their emotional state, not just a simple positive/negative classification. Prepend your response with this emoji, formatted like this: [EMOJI_REACTION: 🤔].
  - For simple happiness or positive news: 😊, 😄
  - For deep gratitude or affection: 🥰, ❤️
  - For sadness, disappointment, or loneliness: 😢, 😔
  - To offer comfort and support: 🤗, 🫂
  - For worry or anxiety: 😟, 😥
  - When the user is thinking, reflecting, or unsure: 🤔, 🧐
  - When you are agreeing or acknowledging a point: 👍, 👌
  - When the user is frustrated or angry: 😠, 😤 (use with care)
  - When the user shares something exciting or surprising: 😮, 🎉
  - When they are tired or overwhelmed: 😴, 😩
  Consider the intensity of the emotion. For example, mild sadness might be 😔, while deep sorrow could be 😭. This makes your reaction more empathetic and accurate.
- End your responses naturally without any special formatting.`
                    },
                });
                setChat(newChat);
            } catch (error) {
                console.error("Initialization error:", error);
                addMessage('model', 'Xin lỗi, đã có lỗi xảy ra khi khởi động. Vui lòng thử lại sau.');
                setIsLoading(false);
            }
        }
        initChat();
    }, []);
    
    useEffect(() => {
        if (chat && !hasGreeted) {
            handleInitialGreeting();
        }
    }, [chat, hasGreeted]);

    useEffect(() => {
      if (chatWindowRef.current) {
          chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
      }
    }, [messages, isLoading]);

    const addMessage = (role: 'user' | 'model', text: string) => {
        setMessages(prev => [...prev, { role, text, timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }]);
    };
    
    const processBotResponse = (responseText: string) => {
        let text = responseText;

        const reactionRegex = /\[EMOJI_REACTION:\s*(.*?)\]/g;
        const reactionMatch = text.match(reactionRegex);
        if (reactionMatch) {
            const reactionEmoji = reactionMatch[0].replace(reactionRegex, '$1').trim();
            text = text.replace(reactionRegex, '').trim();

            setMessages(prev => {
                const updatedMessages = [...prev];
                // FIX: Replace `findLastIndex` with a manual loop for broader browser compatibility.
                let lastUserMessageIndex = -1;
                for (let i = updatedMessages.length - 1; i >= 0; i--) {
                    if (updatedMessages[i].role === 'user') {
                        lastUserMessageIndex = i;
                        break;
                    }
                }
                if (lastUserMessageIndex !== -1) {
                    updatedMessages[lastUserMessageIndex] = {
                        ...updatedMessages[lastUserMessageIndex],
                        reaction: reactionEmoji,
                    };
                }
                return updatedMessages;
            });
        }
        
        const emojiRegex = /\[EMOJI_REPLY:\s*(.*?)\]/g;
        const emojiMatch = text.match(emojiRegex);
        if (emojiMatch) {
            const replies = emojiMatch[0].replace(emojiRegex, '$1').split(',').map(r => r.trim());
            const parsedReplies = replies.map(reply => {
                const parts = reply.split(' ');
                return { emoji: parts[0], text: parts.slice(1).join(' ') };
            });
            setEmojiReplies(parsedReplies);
            text = text.replace(emojiRegex, '').trim();
        } else {
            setEmojiReplies([]);
        }

        const quickReplyRegex = /\[QUICK_REPLY:\s*(.*?)\]/g;
        const quickReplyMatch = text.match(quickReplyRegex);
        if (quickReplyMatch) {
            const replies = quickReplyMatch[0].replace(quickReplyRegex, '$1').split('", "').map(r => r.replace(/"/g, '').trim());
            setQuickReplies(replies);
            text = text.replace(quickReplyRegex, '').trim();
        } else {
            setQuickReplies([]);
        }
        
        if (text) {
            addMessage('model', text);
        }
    };

    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim() || !chat || isLoading || isProcessing.current) return;
        
        isProcessing.current = true;
        setIsLoading(true);
        setQuickReplies([]);
        setEmojiReplies([]);
        addMessage('user', messageText);
        setUserInput('');

        try {
            const response = await chat.sendMessage({ message: messageText });
            processBotResponse(response.text);
        } catch (error) {
            console.error("Send message error:", error);
            addMessage('model', "Rất tiếc, mình gặp sự cố rồi. Bạn thử lại sau nhé.");
        } finally {
            setIsLoading(false);
            isProcessing.current = false;
        }
    };

    const handleUserReaction = async (messageIndex: number, emoji: string) => {
        if (isProcessing.current || !chat || messages[messageIndex].userReaction) return;

        setMessages(prev => {
            const updated = [...prev];
            updated[messageIndex] = { ...updated[messageIndex], userReaction: emoji };
            return updated;
        });

        isProcessing.current = true;
        setIsLoading(true);
        try {
            const response = await chat.sendMessage({ message: `[USER_REACTION: ${emoji}]` });
            processBotResponse(response.text);
        } catch (error)
        {
            console.error("Send reaction error:", error);
            addMessage('model', "Rất tiếc, có lỗi xảy ra khi gửi phản ứng của bạn.");
        } finally
        {
            setIsLoading(false);
            isProcessing.current = false;
        }
    };

    const handleInitialGreeting = async () => {
        if (!chat || hasGreeted) return;
        setHasGreeted(true);
        setIsLoading(true);
        try {
            const initialResponse = await chat.sendMessage({ message: "Bắt đầu cuộc trò chuyện." });
            processBotResponse(initialResponse.text);
        } catch (error) {
            console.error("Initial greeting error:", error);
            addMessage('model', 'Xin chào! Mình là HoneysuckleBot. Rất vui được trò chuyện cùng bạn.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(userInput);
    };

    const ArchiveItem = ({ date, messages, }: ArchivedChat) => {
        const [isOpen, setIsOpen] = useState(false);
      
        return (
          <div className="archive-item">
            <button className="archive-header" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
              <span>{new Date(date).toLocaleString('vi-VN')}</span>
              <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div className="archive-content">
                {messages.map((msg, index) => (
                  <div key={index} className={`archive-message ${msg.role}`}>
                    <p><strong>{msg.role === 'user' ? 'Bạn' : 'Bot'}:</strong> {msg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    };

    const SettingsPanel = () => {
        const handleSetReminder = (e: React.ChangeEvent<HTMLInputElement>) => {
            const time = e.target.value;
            if (time) {
                localStorage.setItem('honeysuckle-reminder', time);
                setReminderTime(time);
            }
        };

        const handleCancelReminder = () => {
            localStorage.removeItem('honeysuckle-reminder');
            setReminderTime(null);
        };

        const handleExportHistory = () => {
            const historyText = messages.map(msg => `[${msg.timestamp}] ${msg.role === 'user' ? 'Bạn' : 'Bot'}: ${msg.text}`).join('\n');
            const blob = new Blob([historyText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `HoneysuckleBot_History_${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        };

        const handleClearHistory = () => {
            if (messages.length > 0 && window.confirm('Bạn có chắc chắn muốn xóa và lưu trữ cuộc trò chuyện này không?')) {
                const newArchive: ArchivedChat[] = [{ date: new Date().toISOString(), messages }, ...archivedChats];
                setArchivedChats(newArchive);
                localStorage.setItem('honeysuckle-archive', JSON.stringify(newArchive));
                setMessages([]);
            } else if(messages.length === 0) {
                alert('Không có gì để xoá.');
            }
        };

        return (
            <>
                <div className="settings-overlay" onClick={() => setShowSettings(false)}></div>
                <div className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
                    <div className="settings-header">
                        <h2 id="settings-title">Cài đặt</h2>
                        <button className="close-settings" onClick={() => setShowSettings(false)} aria-label="Đóng">&times;</button>
                    </div>
                    <div className="settings-panel-content">
                        <div className="settings-section">
                            <h3>Lời nhắc hàng ngày</h3>
                            {reminderTime ? (
                                <div className="reminder-info">
                                    <p>Lời nhắc được đặt vào lúc: <strong>{reminderTime}</strong></p>
                                    <button onClick={handleCancelReminder} className="cancel-reminder-button">Hủy lời nhắc</button>
                                </div>
                            ) : (
                                <div className="reminder-setter">
                                    <label htmlFor="reminder-time">Đặt lời nhắc để kiểm tra cảm xúc:</label>
                                    <input type="time" id="reminder-time" onChange={handleSetReminder} />
                                </div>
                            )}
                        </div>

                        <div className="settings-section">
                            <h3>Lịch sử trò chuyện</h3>
                            <div className="button-group">
                                <button onClick={handleExportHistory} className="export-history-button" disabled={messages.length === 0}>Xuất cuộc trò chuyện</button>
                                <button onClick={handleClearHistory} className="clear-history-button" disabled={messages.length === 0}>Xóa và Lưu trữ</button>
                            </div>
                        </div>

                        <div className="settings-section">
                            <h3>Lưu trữ</h3>
                            <div className="archive-container">
                                {archivedChats.length > 0 ? (
                                    archivedChats.map((chat) => <ArchiveItem key={chat.date} {...chat} />)
                                ) : (
                                    <p className="archive-empty">Chưa có cuộc trò chuyện nào được lưu trữ.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="app-container">
            {showSettings && <SettingsPanel />}
            <header>
                <HoneysuckleIcon />
                <div className="header-text">
                    <h1>HoneysuckleBot</h1>
                    <p>Người bạn đồng hành cảm xúc của bạn</p>
                </div>
                <button className="settings-button" onClick={() => setShowSettings(true)} aria-label="Mở cài đặt">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59-1.69.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                </button>
            </header>
            <main className="chat-window" ref={chatWindowRef} aria-live="polite">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.role}-message`}>
                        {msg.role === 'model' && <RobotIcon />}
                        <div className="message-bubble">
                            <p>{msg.text}</p>
                            <span className="timestamp">{msg.timestamp}</span>
                        </div>
                        {msg.role === 'user' && msg.reaction && (
                            <div className="emoji-reaction" aria-label={`Bot reacted with ${msg.reaction}`}>
                                {msg.reaction}
                            </div>
                        )}
                         {msg.role === 'model' && (
                            <>
                                {!msg.userReaction && !isLoading && (
                                    <div className="reaction-picker" aria-label="React to this message">
                                        {['👍', '❤️', '😄', '🤔'].map(emoji => (
                                            <button 
                                                key={emoji} 
                                                className="reaction-button" 
                                                onClick={() => handleUserReaction(index, emoji)} 
                                                title={`React with ${emoji}`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {msg.userReaction && (
                                    <div className="user-reaction" aria-label={`You reacted with ${msg.userReaction}`}>
                                        {msg.userReaction}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
                 {isLoading && (
                    <div className="message model-message">
                        <RobotIcon />
                        <div className="loading">
                           <div className="dot-flashing"></div>
                        </div>
                    </div>
                )}
            </main>
            
            {emojiReplies.length > 0 && (
                <div className="emoji-replies-container">
                    {emojiReplies.map((reply) => (
                        <button key={reply.emoji} className="emoji-reply-button" onClick={() => handleSendMessage(`${reply.emoji} ${reply.text}`)}>
                            <span className="emoji" aria-hidden="true">{reply.emoji}</span>
                            <span className="emoji-text">{reply.text}</span>
                        </button>
                    ))}
                </div>
            )}
            
            {quickReplies.length > 0 && (
                <div className="quick-replies-container">
                    {quickReplies.map((reply, index) => (
                        <button key={index} className="quick-reply-button" onClick={() => handleSendMessage(reply)}>
                            {reply}
                        </button>
                    ))}
                </div>
            )}
            
            <form className="input-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Nhập tin nhắn của bạn..."
                    disabled={isLoading || !hasGreeted}
                    aria-label="Nhập tin nhắn"
                />
                <button type="submit" disabled={isLoading || !userInput.trim() || !hasGreeted} aria-label="Gửi tin nhắn">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </form>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);