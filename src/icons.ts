// 16px stroke icons from the Figma file. Color comes from `currentColor`.
const svg = (d: string) =>
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="${d}"/></svg>`;

export const ICON = {
  plus: svg("M8 2.6665V13.3332M2.6665 8H13.3332"),
  close: svg("M3.3333 3.3335L12.6666 12.6668M12.6666 3.3335L3.3333 12.6668"),
  open: svg("M4.6667 11.3332L11.3334 4.6665M11.3334 10.6665V4.6665H5.3334"),
  edit: svg("M2.6667 13.3335H5.3334L12.6667 6.0002L10.0001 3.3335L2.6667 10.6668V13.3335Z"),
  link: svg(
    "M6.0001 10.0001L10.0001 6.0001M7.3334 4.0001L8.0001 3.3334C8.504 2.8295 9.1875 2.5464 9.9001 2.5464C10.6127 2.5464 11.2962 2.8295 11.8001 3.3334C12.304 3.8373 12.5871 4.5208 12.5871 5.2334C12.5871 5.946 12.304 6.6295 11.8001 7.1334L11.1334 7.8001M8.6668 12.0001L8.0001 12.6667C7.4962 13.1706 6.8127 13.4537 6.1001 13.4537C5.3875 13.4537 4.704 13.1706 4.2001 12.6667C3.6962 12.1628 3.4131 11.4794 3.4131 10.7667C3.4131 10.0541 3.6962 9.3706 4.2001 8.8667L4.8668 8.2001",
  ),
  trash: svg("M2.6667 4.6665H13.3334M6.0001 4.6665V2.6665H10.0001V4.6665M4.0001 4.6665L4.6667 13.3332H11.3334L12.0001 4.6665"),
  folder: svg("M2 4H6L7.3333 5.3333H14V12.6667H2V4Z"),
  bookmark: svg("M4 2H12V14L8 11.3333L4 14V2Z"),
  chevron: svg("M4 6L8 10L12 6"),
  check: svg("M3.3334 8L6.6667 11.3333L12.6667 4.6667"),
  /** 12px check drawn inside the checkbox. */
  tick: `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M2.5 6L5 8.5L9.5 3.5"/></svg>`,
};
