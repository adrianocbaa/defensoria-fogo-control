import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { Bot, MessageCircleQuestion, RotateCcw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SuporteMensagemRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGESTOES = [
  'Como preencher o RDO do dia?',
  'Como criar uma nova medição?',
  'Como registrar pendências no checklist?',
  'Como abrir um chamado de manutenção?',
];

function toUIMessage(row: SuporteMensagemRow): UIMessage {
  return {
    id: row.id,
    role: row.role,
    parts: [{ type: 'text', text: row.content }],
  };
}

export function SuporteChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const historicoCarregado = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suporte-chat`,
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return { Authorization: `Bearer ${data.session?.access_token ?? ''}` };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages, error, stop } = useChat({
    id: 'suporte',
    transport,
  });

  useEffect(() => {
    historicoCarregado.current = false;
    setMessages([]);
  }, [user?.id, setMessages]);

  useEffect(() => {
    if (!open || historicoCarregado.current || !user) return;
    historicoCarregado.current = true;
    setCarregando(true);
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('suporte_mensagens')
        .select('id, role, content')
        .order('created_at', { ascending: true })
        .limit(500);
      if (!fetchError && data) {
        setMessages((data as SuporteMensagemRow[]).map(toUIMessage));
      }
      setCarregando(false);
    })();
  }, [open, user, setMessages]);

  const limparConversa = async () => {
    stop();
    if (user) {
      await supabase.from('suporte_mensagens').delete().eq('user_id', user.id);
    }
    setMessages([]);
  };

  const ocupado = status === 'submitted' || status === 'streaming';

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
        aria-label="Abrir assistente de suporte"
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base">Assistente SiDIF</SheetTitle>
                <SheetDescription className="text-xs">
                  Tire dúvidas sobre os processos do sistema
                </SheetDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={limparConversa}
                disabled={ocupado || messages.length === 0}
                aria-label="Limpar conversa"
                title="Limpar conversa"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Fechar assistente"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <Conversation className="flex-1">
            <ConversationContent className="px-4 py-4">
              {carregando ? (
                <div className="flex h-full items-center justify-center py-10 text-sm text-muted-foreground">
                  <Shimmer>Carregando conversa...</Shimmer>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Olá! Como posso ajudar?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pergunte sobre RDO, medição, checklist, manutenção e mais.
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2">
                    {SUGESTOES.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => sendMessage({ text: s })}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <Message
                    key={message.id}
                    from={message.role}
                    className={message.role === 'assistant' ? 'mb-4' : 'mb-4 justify-end'}
                  >
                    {message.role === 'user' ? (
                      <MessageContent variant="bubble">
                        {message.parts
                          .filter((p) => p.type === 'text')
                          .map((p, i) => (
                            <span key={i} className="whitespace-pre-wrap">
                              {(p as { type: 'text'; text: string }).text}
                            </span>
                          ))}
                      </MessageContent>
                    ) : (
                      <MessageContent>
                        <MessageResponse>
                          {message.parts
                            .filter((p) => p.type === 'text')
                            .map((p, i) => (p as { type: 'text'; text: string }).text)
                            .join('')}
                        </MessageResponse>
                      </MessageContent>
                    )}
                  </Message>
                ))
              )}

              {status === 'submitted' && (
                <div className="mb-4 text-sm text-muted-foreground">
                  <Shimmer>Pensando...</Shimmer>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Não foi possível obter a resposta. {error.message}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-auto p-1 underline"
                    onClick={() => sendMessage({ text: 'Tente novamente responder à última pergunta.' })}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Tentar novamente
                  </Button>
                </div>
              )}

              <ConversationScrollButton />
            </ConversationContent>
          </Conversation>

          <div className="border-t p-3">
            <PromptInput
              onSubmit={(mensagem) => {
                const texto =
                  typeof mensagem === 'string'
                    ? mensagem
                    : (mensagem as { text?: string })?.text ?? '';
                if (texto.trim()) sendMessage({ text: texto.trim() });
              }}
            >
              <PromptInputTextarea
                placeholder="Digite sua dúvida..."
                maxLength={4000}
                rows={2}
              />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit status={status} disabled={!user} onStop={stop} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
