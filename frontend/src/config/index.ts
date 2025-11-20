import { t } from "@/lang/i18n";
import { getRandomId } from "@/tools/randId";
import type { LayoutCard } from "@/types";
import { defineAsyncComponent } from "vue";

// Critical widgets loaded immediately
import DefaultCard from "@/widgets/DefaultCard.vue";
import EmptyCard from "@/widgets/EmptyCard.vue";
import LoginCard from "@/widgets/LoginCard.vue";

// Lazy load all other widgets for better initial load performance
const ImageManager = defineAsyncComponent(() => import("@/widgets/imageManager/index.vue"));
const NewImage = defineAsyncComponent(() => import("@/widgets/imageManager/NewImage.vue"));
const InstanceBaseInfo = defineAsyncComponent(() => import("@/widgets/instance/BaseInfo.vue"));
const InstanceFileManager = defineAsyncComponent(() => import("@/widgets/instance/FileManager.vue"));
const InstanceManagerBtns = defineAsyncComponent(() => import("@/widgets/instance/ManagerBtns.vue"));
const Schedule = defineAsyncComponent(() => import("@/widgets/instance/Schedule.vue"));
const InstanceServerConfigFile = defineAsyncComponent(() => import("@/widgets/instance/ServerConfigFile.vue"));
const InstanceServerConfigOverview = defineAsyncComponent(() => import("@/widgets/instance/ServerConfigOverview.vue"));
const InstanceShortcut = defineAsyncComponent(() => import("@/widgets/instance/Shortcut.vue"));
const InstanceOperationLogs = defineAsyncComponent(() => import("@/widgets/instance/OperationLogs.vue"));
const Terminal = defineAsyncComponent(() => import("@/widgets/instance/Terminal.vue"));
const InstanceChart = defineAsyncComponent(() => import("@/widgets/InstanceChart.vue"));
const InstanceList = defineAsyncComponent(() => import("@/widgets/InstanceList.vue"));
const Market = defineAsyncComponent(() => import("@/widgets/Market.vue"));
const NodeItem = defineAsyncComponent(() => import("@/widgets/node/NodeItem.vue"));
const NodeList = defineAsyncComponent(() => import("@/widgets/NodeList.vue"));
const NodeOverview = defineAsyncComponent(() => import("@/widgets/NodeOverview.vue"));
const OperationLogCard = defineAsyncComponent(() => import("@/widgets/OperationLogCard.vue"));
const Carousel = defineAsyncComponent(() => import("@/widgets/others/Carousel.vue"));
const ClockCard = defineAsyncComponent(() => import("@/widgets/others/ClockCard.vue"));
const IframeCard = defineAsyncComponent(() => import("@/widgets/others/IframeCard.vue"));
const ImageBox = defineAsyncComponent(() => import("@/widgets/others/ImageBox.vue"));
const LinkCard = defineAsyncComponent(() => import("@/widgets/others/LinkCard.vue"));
const MusicCard = defineAsyncComponent(() => import("@/widgets/others/MusicCard.vue"));
const PluginCard = defineAsyncComponent(() => import("@/widgets/others/PluginCard.vue"));
const TextCard = defineAsyncComponent(() => import("@/widgets/others/TextCard.vue"));
const Page404 = defineAsyncComponent(() => import("@/widgets/Page404.vue"));
const DataOverview = defineAsyncComponent(() => import("@/widgets/stats/StatsOverviewModern.vue"));
const RequestChart = defineAsyncComponent(() => import("@/widgets/RequestChart.vue"));
const Settings = defineAsyncComponent(() => import("@/widgets/Settings.vue"));
const McPreset = defineAsyncComponent(() => import("@/widgets/setupApp/McPreset.vue"));
const QuickStartFlow = defineAsyncComponent(() => import("@/widgets/setupApp/QuickStartFlow.vue"));
const ShelvesCard = defineAsyncComponent(() => import("@/widgets/ShelvesCard.vue"));
const StatusBlock = defineAsyncComponent(() => import("@/widgets/StatusBlock.vue"));
const TitleCard = defineAsyncComponent(() => import("@/widgets/TitleCard.vue"));
const UserAccessSettings = defineAsyncComponent(() => import("@/widgets/user/AccessSettings.vue"));
const UserInstanceList = defineAsyncComponent(() => import("@/widgets/UserInstanceList.vue"));
const UserList = defineAsyncComponent(() => import("@/widgets/UserList.vue"));
const UserStatusBlock = defineAsyncComponent(() => import("@/widgets/UserStatusBlock.vue"));

import { NEW_CARD_TYPE } from "../types/index";
import { LayoutCardHeight } from "./originLayoutConfig";
import { ROLE } from "./router";

// Register specified Vue components for each card.
export const LAYOUT_CARD_TYPES: { [key: string]: any } = {
  LoginCard,
  Page404,
  TitleCard,
  EmptyCard,
  DataOverview,
  StatusBlock,
  NodeOverview,
  RequestChart,
  InstanceChart,
  InstanceList,
  NodeList,
  NodeItem,
  Settings,
  UserList,
  Terminal,
  InstanceManagerBtns,
  InstanceBaseInfo,
  InstanceServerConfigOverview,
  InstanceServerConfigFile,
  InstanceFileManager,
  InstanceOperationLogs,
  UserAccessSettings,
  ImageBox,
  QuickStartFlow,
  McPreset,
  IframeCard,
  TextCard,
  LinkCard,
  ClockCard,
  UserStatusBlock,
  UserInstanceList,
  ImageManager,
  NewImage,
  Schedule,
  InstanceShortcut,
  DefaultCard,
  Carousel,
  PluginCard,
  MusicCard,
  ShelvesCard,
  OperationLogCard,
  Market
};

export interface NewCardItem extends LayoutCard {
  category: NEW_CARD_TYPE;
  permission: ROLE;
}

export function getLayoutCardPool() {
  const LAYOUT_CARD_POOL: NewCardItem[] = [
    {
      id: getRandomId(),
      permission: ROLE.GUEST,
      meta: {},
      type: "EmptyCard",
      title: t("TXT_CODE_b23e2bab"),
      width: 2,
      description: t("TXT_CODE_b3e2f83e"),
      height: LayoutCardHeight.MINI,
      category: NEW_CARD_TYPE.COMMON
    },
    {
      id: getRandomId(),
      permission: ROLE.GUEST,
      meta: {},
      type: "TitleCard",
      title: t("TXT_CODE_8981d724"),
      width: 12,
      description: t("TXT_CODE_9466852b"),
      height: LayoutCardHeight.AUTO,
      category: NEW_CARD_TYPE.COMMON
    },

    {
      id: getRandomId(),
      permission: ROLE.USER,
      type: "Terminal",
      title: t("TXT_CODE_71a51d19"),
      width: 6,
      description: t("TXT_CODE_10a6d36f"),
      height: LayoutCardHeight.BIG,
      category: NEW_CARD_TYPE.INSTANCE,
      meta: {
        viewType: "card"
      },
      params: [
        {
          field: "instanceId",
          label: t("TXT_CODE_e6a5c12b"),
          type: "string"
        },
        {
          field: "daemonId",
          label: t("TXT_CODE_72cfab69"),
          type: "string"
        },
        {
          field: "instance",
          label: t("TXT_CODE_cb043d10"),
          type: "instance"
        }
      ]
    },

    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      type: "StatusBlock",
      title: t("TXT_CODE_b4a9d04a"),
      meta: {
        type: "node"
      },
      width: 3,
      description: t("TXT_CODE_55ade942"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.DATA
    },

    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      type: "StatusBlock",
      title: t("TXT_CODE_88e9361a"),
      meta: {
        type: "instance"
      },
      width: 3,
      description: t("TXT_CODE_55ade942"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.DATA
    },
    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      type: "StatusBlock",
      title: t("TXT_CODE_db64faf6"),
      meta: {
        type: "users"
      },
      width: 3,
      description: t("TXT_CODE_55ade942"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.DATA
    },
    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      type: "StatusBlock",
      title: t("TXT_CODE_66056676"),
      meta: {
        type: "system"
      },
      width: 3,
      description: t("TXT_CODE_55ade942"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.DATA
    },

    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      meta: {},
      type: "Settings",
      title: t("TXT_CODE_b5c7b82d"),
      width: 8,
      description: t("TXT_CODE_e78047a5"),
      height: LayoutCardHeight.MEDIUM,
      category: NEW_CARD_TYPE.OTHER
    },

    {
      id: getRandomId(),
      permission: ROLE.GUEST,
      meta: {},
      type: "ImageBox",
      title: t("TXT_CODE_4d993ca4"),
      width: 4,
      description: t("TXT_CODE_6ef5195f"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.COMMON
    },

    {
      id: getRandomId(),
      permission: ROLE.GUEST,
      meta: {},
      type: "Carousel",
      title: t("TXT_CODE_5a196078"),
      width: 4,
      description: t("TXT_CODE_6ef5195f"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.COMMON
    },

    {
      id: getRandomId(),
      permission: ROLE.GUEST,
      meta: {},
      type: "IframeCard",
      title: t("TXT_CODE_3ed96265"),
      width: 4,
      description: t("TXT_CODE_db9375a5"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.COMMON
    },

    {
      id: getRandomId(),
      permission: ROLE.GUEST,
      meta: {},
      type: "TextCard",
      title: t("TXT_CODE_ddcca0b9"),
      width: 4,
      description: t("TXT_CODE_2ca42b39"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.COMMON
    },

    {
      id: getRandomId(),
      permission: ROLE.GUEST,
      meta: {},
      type: "LinkCard",
      title: t("TXT_CODE_745d8a03"),
      width: 4,
      description: t("TXT_CODE_d6a96ea4"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.COMMON
    },
    {
      id: getRandomId(),
      permission: ROLE.GUEST,
      meta: {},
      type: "ClockCard",
      title: t("TXT_CODE_af143e18"),
      width: 4,
      description: t("TXT_CODE_cf9e259c"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.COMMON
    },
    {
      id: getRandomId(),
      permission: ROLE.GUEST,
      meta: {},
      type: "MusicCard",
      title: t("TXT_CODE_660e2341"),
      width: 4,
      description: t("TXT_CODE_903a9ec9"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.COMMON
    },
    {
      id: getRandomId(),
      permission: ROLE.USER,
      meta: {},
      type: "InstanceShortcut",
      title: t("TXT_CODE_ea0840c9"),
      width: 3,
      description: t("TXT_CODE_3fce7ccb"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.INSTANCE,
      params: [
        {
          field: "instanceId",
          label: t("TXT_CODE_e6a5c12b"),
          type: "string"
        },
        {
          field: "daemonId",
          label: t("TXT_CODE_72cfab69"),
          type: "string"
        },
        {
          field: "instance",
          label: t("TXT_CODE_cb043d10"),
          type: "instance"
        }
      ]
    },
    {
      id: getRandomId(),
      permission: ROLE.USER,
      meta: {},
      type: "InstanceFileManager",
      title: t("TXT_CODE_72cce10b"),
      width: 12,
      description: t("TXT_CODE_f49b2787"),
      height: LayoutCardHeight.MEDIUM,
      category: NEW_CARD_TYPE.INSTANCE,
      params: [
        {
          field: "instanceId",
          label: t("TXT_CODE_e6a5c12b"),
          type: "string"
        },
        {
          field: "daemonId",
          label: t("TXT_CODE_72cfab69"),
          type: "string"
        },
        {
          field: "instance",
          label: t("TXT_CODE_cb043d10"),
          type: "instance"
        }
      ]
    },
    {
      id: getRandomId(),
      permission: ROLE.USER,
      meta: {},
      type: "InstanceBaseInfo",
      title: t("TXT_CODE_eadb4f60"),
      width: 4,
      description: t("TXT_CODE_97e5eccb"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.INSTANCE,
      params: [
        {
          field: "instanceId",
          label: t("TXT_CODE_e6a5c12b"),
          type: "string"
        },
        {
          field: "daemonId",
          label: t("TXT_CODE_72cfab69"),
          type: "string"
        },
        {
          field: "instance",
          label: t("TXT_CODE_cb043d10"),
          type: "instance"
        }
      ]
    },
    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      type: "RequestChart",
      title: t("TXT_CODE_a4037a98"),
      meta: {},
      width: 6,
      description: t("TXT_CODE_6f659da2"),
      height: LayoutCardHeight.MINI,
      category: NEW_CARD_TYPE.DATA
    },
    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      type: "InstanceChart",
      title: t("TXT_CODE_d6d9c42c"),
      meta: {},
      width: 6,
      description: t("TXT_CODE_6f659da2"),
      height: LayoutCardHeight.MINI,
      category: NEW_CARD_TYPE.DATA
    },
    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      type: "NodeOverview",
      title: t("TXT_CODE_4bedec2a"),
      meta: {},
      width: 12,
      description: t("TXT_CODE_2a8dc13f"),
      height: LayoutCardHeight.BIG,
      category: NEW_CARD_TYPE.DATA
    },
    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      type: "OperationLogCard",
      title: t("TXT_CODE_f6a33629"),
      meta: {},
      width: 3,
      description: t("TXT_CODE_9e8c176e"),
      height: LayoutCardHeight.MEDIUM,
      category: NEW_CARD_TYPE.DATA
    },
    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      type: "DataOverview",
      title: t("TXT_CODE_721157a3"),
      meta: {},
      width: 8,
      description: t("TXT_CODE_55ade942"),
      height: LayoutCardHeight.MEDIUM,
      category: NEW_CARD_TYPE.DATA
    },
    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      meta: {},
      type: "NodeItem",
      title: t("TXT_CODE_def287e0"),
      width: 6,
      description: t("TXT_CODE_abe0862e"),
      height: LayoutCardHeight.MEDIUM,
      category: NEW_CARD_TYPE.INSTANCE,
      params: [
        {
          field: "daemonId",
          label: t("TXT_CODE_72cfab69"),
          type: "string"
        },
        {
          field: "instance",
          label: t("TXT_CODE_e7cad65f"),
          type: "instance"
        }
      ]
    },
    {
      id: getRandomId(),
      permission: ROLE.USER,
      meta: {},
      type: "InstanceManagerBtns",
      title: t("TXT_CODE_d2bbb2f1"),
      width: 8,
      description: t("TXT_CODE_1934114b"),
      height: LayoutCardHeight.MEDIUM,
      category: NEW_CARD_TYPE.INSTANCE,
      params: [
        {
          field: "instanceId",
          label: t("TXT_CODE_e6a5c12b"),
          type: "string"
        },
        {
          field: "daemonId",
          label: t("TXT_CODE_72cfab69"),
          type: "string"
        },
        {
          field: "instance",
          label: t("TXT_CODE_cb043d10"),
          type: "instance"
        }
      ]
    },
    {
      id: getRandomId(),
      permission: ROLE.GUEST,
      meta: {},
      type: "PluginCard",
      title: t("TXT_CODE_5ebec0db"),
      width: 4,
      description: t("TXT_CODE_cb84b22"),
      height: LayoutCardHeight.SMALL,
      category: NEW_CARD_TYPE.COMMON
    },
    {
      id: getRandomId(),
      permission: ROLE.GUEST,
      meta: {},
      type: "ShelvesCard",
      title: t("TXT_CODE_b99cae18"),
      width: 8,
      description: t("TXT_CODE_163e2d0a"),
      height: LayoutCardHeight.MEDIUM,
      category: NEW_CARD_TYPE.COMMON
    },
    {
      id: getRandomId(),
      permission: ROLE.USER,
      meta: {},
      type: "Market",
      title: t("TXT_CODE_27594db8"),
      width: 12,
      description: t("TXT_CODE_9b45858c"),
      height: LayoutCardHeight.BIG,
      category: NEW_CARD_TYPE.COMMON
    },
    {
      id: getRandomId(),
      permission: ROLE.ADMIN,
      meta: {},
      type: "UserAccessSettings",
      title: t("TXT_CODE_76d20724"),
      width: 12,
      description: t("TXT_CODE_4d934e3a"),
      height: LayoutCardHeight.MEDIUM,
      category: NEW_CARD_TYPE.OTHER,
      params: [
        {
          field: "uuid",
          label: t("TXT_CODE_93b4c7ec"),
          type: "string"
        }
      ]
    }
  ];
  return LAYOUT_CARD_POOL;
}
