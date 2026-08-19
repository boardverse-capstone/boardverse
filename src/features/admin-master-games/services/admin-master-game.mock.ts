import type {
  CreateMasterGameComponentRequest,
  MasterGameComponent,
  UpdateMasterGameComponentRequest,
} from '../types/master-game.interface';
import { mapApiMasterGameComponent } from '../utils/master-game.mapper';

const delay = () => new Promise((resolve) => setTimeout(resolve, 350));

const MOCK_COMPONENTS: Record<string, MasterGameComponent[]> = {
  default: [
    {
      componentId: 'cmp-001',
      name: 'Xúc xắc',
      type: 'DICE',
      defaultQuantity: 2,
    },
    {
      componentId: 'cmp-002',
      name: 'Thẻ bài',
      type: 'CARD',
      defaultQuantity: 120,
    },
  ],
};

export const AdminMasterGameMockService = {
  getComponents: async (gameTemplateId: string): Promise<MasterGameComponent[]> => {
    await delay();
    return MOCK_COMPONENTS[gameTemplateId] ?? MOCK_COMPONENTS.default;
  },

  createComponent: async (
    gameTemplateId: string,
    payload: CreateMasterGameComponentRequest,
  ): Promise<MasterGameComponent> => {
    await delay();
    const list = MOCK_COMPONENTS[gameTemplateId] ?? MOCK_COMPONENTS.default;
    const created: MasterGameComponent = {
      componentId: `cmp-${Date.now()}`,
      ...payload,
    };
    if (!MOCK_COMPONENTS[gameTemplateId]) {
      MOCK_COMPONENTS[gameTemplateId] = [...list];
    }
    MOCK_COMPONENTS[gameTemplateId].push(created);
    return created;
  },

  updateComponent: async (
    gameTemplateId: string,
    componentId: string,
    payload: UpdateMasterGameComponentRequest,
  ): Promise<MasterGameComponent> => {
    await delay();
    const list = MOCK_COMPONENTS[gameTemplateId] ?? MOCK_COMPONENTS.default;
    const index = list.findIndex((item) => item.componentId === componentId);
    if (index === -1) throw new Error('Không tìm thấy linh kiện.');
    list[index] = { componentId, ...payload };
    MOCK_COMPONENTS[gameTemplateId] = list;
    return list[index];
  },

  deleteComponent: async (gameTemplateId: string, componentId: string): Promise<void> => {
    await delay();
    const list = MOCK_COMPONENTS[gameTemplateId] ?? MOCK_COMPONENTS.default;
    MOCK_COMPONENTS[gameTemplateId] = list.filter((item) => item.componentId !== componentId);
  },
};
