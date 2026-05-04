export interface ChatbotRequest {
  message: string;
  maxResults?: number;
}

export interface ChatbotAction {
  type?: string | null;
  label?: string | null;
  route?: string | null;
}

export interface ChatbotItem {
  module?: string | null;
  id?: number | null;
  title?: string | null;
  subtitle?: string | null;
  status?: string | null;
  date?: string | null;
}

export interface ChatbotResponse {
  answer: string;
  intent?: string | null;
  items?: ChatbotItem[] | null;
  actions?: ChatbotAction[] | null;
}
