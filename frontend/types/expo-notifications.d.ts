declare module "expo-notifications" {
  export const AndroidImportance: { MAX: any };
  export function setNotificationHandler(handler: any): void;
  export function setNotificationChannelAsync(id: string, options: any): Promise<any>;
  export function getPermissionsAsync(): Promise<{ status: string }>;
  export function requestPermissionsAsync(): Promise<{ status: string }>;
  export function getExpoPushTokenAsync(options: { projectId: string }): Promise<{ data: string }>;
  export function addNotificationResponseReceivedListener(listener: (response: any) => void): { remove(): void };
}
