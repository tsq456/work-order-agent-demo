"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEMO_ATTACHMENT,
  DEMO_WORK_ORDER_ID,
  EMPTY_DRAFT,
  INITIAL_WORK_ORDERS,
} from "./mock-data";
import * as mockFns from "./mock-functions";
import type {
  AssigneeCandidate,
  ClarificationSession,
  WorkOrder,
  WorkOrderDraft,
  WorkOrderStats,
} from "./types";

type DemoStoreValue = {
  workOrders: WorkOrder[];
  draft: WorkOrderDraft;
  clarification: ClarificationSession;
  selectedWorkOrderId: string | null;
  lastCreatedId: string | null;
  selectedAssigneeId: string;
  candidates: AssigneeCandidate[];
  createBlocked: boolean;
  assignBlocked: boolean;
  stats: WorkOrderStats;
  setDraft: (updater: (prev: WorkOrderDraft) => WorkOrderDraft) => void;
  setClarification: (session: ClarificationSession) => void;
  addDemoAttachment: () => void;
  selectWorkOrder: (id: string | null) => void;
  setSelectedAssigneeId: (id: string) => void;
  setCandidates: (candidates: AssigneeCandidate[]) => void;
  createWorkOrderFromDraft: () => Promise<
    | { ok: true; workOrder: WorkOrder }
    | { ok: false; error: string }
  >;
  assignSelectedWorkOrder: (
    assigneeId: string,
  ) => Promise<
    | { ok: true; workOrder: WorkOrder }
    | { ok: false; error: string }
  >;
  upsertWorkOrders: (orders: WorkOrder[]) => void;
  resetAll: () => Promise<void>;
  getWorkOrder: (id: string) => WorkOrder | undefined;
  getPendingAcceptOrders: () => WorkOrder[];
  getDemoWorkOrder: () => WorkOrder | undefined;
};

const DemoStoreContext = createContext<DemoStoreValue | null>(null);

const IDLE_CLARIFICATION: ClarificationSession = {
  status: "idle",
  userText: "",
  knownFields: {},
  missingFields: [],
  guessedFields: {},
};

function computeStats(workOrders: WorkOrder[], draft: WorkOrderDraft): WorkOrderStats {
  const pendingAccept = workOrders.filter((item) => item.status === "待受理").length;
  const pendingProcess = workOrders.filter((item) => item.status === "待处理").length;
  return {
    draft: draft.serviceType ? 1 : 0,
    pendingAccept,
    pendingProcess,
    total: workOrders.length,
  };
}

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() =>
    INITIAL_WORK_ORDERS.map((item) => ({
      ...item,
      attachments: item.attachments.map((file) => ({ ...file })),
    })),
  );
  const [draft, setDraftState] = useState<WorkOrderDraft>(() => ({
    ...EMPTY_DRAFT,
    attachments: [],
  }));
  const [clarification, setClarification] =
    useState<ClarificationSession>(IDLE_CLARIFICATION);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(
    null,
  );
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("zhang");
  const [candidates, setCandidates] = useState<AssigneeCandidate[]>([]);
  const [createBlocked, setCreateBlocked] = useState(false);
  const [assignBlocked, setAssignBlocked] = useState(false);

  const setDraft = useCallback(
    (updater: (prev: WorkOrderDraft) => WorkOrderDraft) => {
      setDraftState((prev) => updater(prev));
    },
    [],
  );

  const addDemoAttachment = useCallback(() => {
    setDraftState((prev) => {
      if (prev.attachments.some((item) => item.fileName === DEMO_ATTACHMENT.fileName)) {
        return prev;
      }
      return {
        ...prev,
        attachments: [...prev.attachments, { ...DEMO_ATTACHMENT }],
      };
    });
  }, []);

  const createWorkOrderFromDraft = useCallback(async () => {
    const result = await mockFns.createMockWorkOrder({
      draft,
      existing: workOrders,
    });
    if (!result.ok) {
      setCreateBlocked(result.error.includes("已存在"));
      return result;
    }
    setWorkOrders((prev) => [...prev, result.workOrder]);
    setLastCreatedId(result.workOrder.id);
    setSelectedWorkOrderId(result.workOrder.id);
    setCreateBlocked(true);
    setAssignBlocked(false);
    setClarification(IDLE_CLARIFICATION);
    return { ok: true as const, workOrder: result.workOrder };
  }, [draft, workOrders]);

  const assignSelectedWorkOrder = useCallback(
    async (assigneeId: string) => {
      const target =
        workOrders.find((item) => item.id === selectedWorkOrderId) ??
        workOrders.find((item) => item.id === DEMO_WORK_ORDER_ID) ??
        workOrders.find((item) => item.id === lastCreatedId);

      if (!target) {
        return { ok: false as const, error: "未找到可分派的工单。" };
      }

      const result = await mockFns.assignMockWorkOrder({
        workOrder: target,
        assigneeId,
      });
      if (!result.ok) {
        setAssignBlocked(true);
        return result;
      }

      setWorkOrders((prev) =>
        prev.map((item) => (item.id === result.workOrder.id ? result.workOrder : item)),
      );
      setSelectedWorkOrderId(result.workOrder.id);
      setAssignBlocked(true);
      return { ok: true as const, workOrder: result.workOrder };
    },
    [workOrders, selectedWorkOrderId, lastCreatedId],
  );

  const resetAll = useCallback(async () => {
    const result = await mockFns.resetDemo();
    setWorkOrders(result.workOrders);
    setDraftState(result.draft);
    setClarification(IDLE_CLARIFICATION);
    setSelectedWorkOrderId(null);
    setLastCreatedId(null);
    setSelectedAssigneeId("zhang");
    setCandidates([]);
    setCreateBlocked(false);
    setAssignBlocked(false);
  }, []);

  const upsertWorkOrders = useCallback((orders: WorkOrder[]) => {
    setWorkOrders((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]));
      for (const order of orders) {
        map.set(order.id, {
          ...order,
          attachments: order.attachments.map((file) => ({ ...file })),
        });
      }
      return Array.from(map.values());
    });
  }, []);

  const value = useMemo<DemoStoreValue>(() => {
    return {
      workOrders,
      draft,
      clarification,
      selectedWorkOrderId,
      lastCreatedId,
      selectedAssigneeId,
      candidates,
      createBlocked,
      assignBlocked,
      stats: computeStats(workOrders, draft),
      setDraft,
      setClarification,
      addDemoAttachment,
      selectWorkOrder: setSelectedWorkOrderId,
      setSelectedAssigneeId,
      setCandidates,
      createWorkOrderFromDraft,
      assignSelectedWorkOrder,
      upsertWorkOrders,
      resetAll,
      getWorkOrder: (id) => workOrders.find((item) => item.id === id),
      getPendingAcceptOrders: () =>
        workOrders.filter((item) => item.status === "待受理"),
      getDemoWorkOrder: () =>
        workOrders.find((item) => item.id === DEMO_WORK_ORDER_ID) ??
        (lastCreatedId
          ? workOrders.find((item) => item.id === lastCreatedId)
          : undefined),
    };
  }, [
    workOrders,
    draft,
    clarification,
    selectedWorkOrderId,
    lastCreatedId,
    selectedAssigneeId,
    candidates,
    createBlocked,
    assignBlocked,
    setDraft,
    addDemoAttachment,
    createWorkOrderFromDraft,
    assignSelectedWorkOrder,
    upsertWorkOrders,
    resetAll,
  ]);

  return (
    <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>
  );
}

export function useDemoStore() {
  const ctx = useContext(DemoStoreContext);
  if (!ctx) {
    throw new Error("useDemoStore must be used within DemoStoreProvider");
  }
  return ctx;
}
