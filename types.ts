
export interface Mockup {
  id: string;
  type: string;
  imageUrl: string;
  originalPrompt: string;
  status: 'queued' | 'generating' | 'ready' | 'error';
  draftPrompt?: string;
}

export type ProductType = 
  | 'T-Shirt (White)' 
  | 'T-Shirt (Black)' 
  | 'Hoodie' 
  | 'Coffee Mug' 
  | 'Tote Bag' 
  | 'Cap' 
  | 'Phone Case';

export interface ProductTemplate {
  name: ProductType;
  prompt: string;
}
