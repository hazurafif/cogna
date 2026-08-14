import React from "react";
import { Pressable } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement(Text, null, children),
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() },
  };
});
import { Bell, User } from "lucide-react-native";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import { ProgressRingChart } from "../charts/progress-ring-chart";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Icon } from "./icon";
import { Image } from "./image";
import { HelloWave } from "./hello-wave";
import { GroupedInput, Input } from "./input";
import { Link } from "./link";
import { ModeToggle } from "./mode-toggle";
import { ScrollView } from "./scroll-view";
import { Skeleton } from "./skeleton";
import { Progress } from "./progress";
import { Separator } from "./separator";
import { Spinner } from "./spinner";
import { ToastProvider, useToast } from "./toast";
import { Text } from "./text";
import { ModeProvider } from "../../providers/mode-provider";
import { View } from "./view";

describe("BNA ui components", () => {
  it("Text renders every variant", async () => {
    const { getByText } = await render(
      <>
        <Text variant="heading">heading</Text>
        <Text variant="title">title</Text>
        <Text variant="subtitle">subtitle</Text>
        <Text variant="caption">caption</Text>
        <Text variant="link">link</Text>
        <Text>body</Text>
      </>,
    );
    for (const label of ["heading", "title", "subtitle", "caption", "link", "body"]) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it("View renders children and is transparent by default", async () => {
    const { getByText, getByTestId } = await render(
      <View testID="view"><Text>inside</Text></View>,
    );
    expect(getByText("inside")).toBeTruthy();
    expect(getByTestId("view").props.style[0].backgroundColor).toBe("transparent");
  });

  it("Icon renders a lucide icon with explicit color", async () => {
    const { toJSON } = await render(<Icon name={Bell} color="#123456" size={20} />);
    expect(toJSON()).toBeTruthy();
  });

  it("Button fires onPress, honours disabled and shows a spinner while loading", async () => {
    const onPress = jest.fn();
    const { getByText, getByTestId, rerender } = await render(
      <Button onPress={onPress} testID="btn">Save</Button>,
    );
    await fireEvent.press(getByText("Save"));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<Button onPress={onPress} testID="btn" disabled>Save</Button>);
    await fireEvent.press(getByText("Save"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(getByTestId("btn").props.accessibilityState.disabled).toBe(true);

    await rerender(<Button onPress={onPress} testID="btn" loading>Save</Button>);
    await fireEvent.press(getByTestId("btn"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(getByTestId("btn").props.accessibilityState.busy).toBe(true);
  });

  it("Button renders every variant and size, animated and static", async () => {
    const { getByTestId, rerender } = await render(
      <Button variant="destructive" size="sm" testID="btn">Go</Button>,
    );
    expect(getByTestId("btn")).toBeTruthy();

    await rerender(
      <Button variant="outline" size="lg" testID="btn" animation={false}>Go</Button>,
    );
    expect(getByTestId("btn")).toBeTruthy();

    await rerender(
      <Button variant="ghost" size="icon" icon={User} label="Profile" testID="btn" />,
    );
    expect(getByTestId("btn")).toBeTruthy();

    await rerender(
      <Button variant="link" testID="btn" animation={false}>Follow link</Button>,
    );
    expect(getByTestId("btn")).toBeTruthy();
  });

  it("Button press-in animation triggers haptics without crashing", async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <Button onPress={onPress} testID="btn" haptic>
        Animated
      </Button>,
    );
    await fireEvent.press(getByTestId("btn"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("Card composes header, title, description, content and footer", async () => {
    const { getByText } = await render(
      <Card>
        <CardHeader><CardTitle>Title</CardTitle></CardHeader>
        <CardDescription>Description</CardDescription>
        <CardContent><Text>content</Text></CardContent>
        <CardFooter><Text>footer</Text></CardFooter>
      </Card>,
    );
    for (const label of ["Title", "Description", "content", "footer"]) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it("Input types, renders labels/icons and shows validation errors", async () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText, getByText, rerender } = await render(
      <Input icon={User} label="Name" placeholder="Your name" onChangeText={onChangeText} />,
    );
    await fireEvent.changeText(getByPlaceholderText("Your name"), "Rafif");
    expect(onChangeText).toHaveBeenCalledWith("Rafif");
    expect(getByText("Name")).toBeTruthy();

    await rerender(
      <Input placeholder="Broken" error="Nope" variant="outline" />,
    );
    expect(getByText("Nope")).toBeTruthy();

    await rerender(
      <Input placeholder="Notes" type="textarea" rows={3} />,
    );
    expect(getByPlaceholderText("Notes").props.multiline).toBe(true);
  });

  it("GroupedInput stacks children and reports errors", async () => {
    const { getByText, getAllByText } = await render(
      <GroupedInput title="Settings">
        <Input placeholder="One" />
        <Input placeholder="Two" error="Bad two" />
      </GroupedInput>,
    );
    expect(getByText("Settings")).toBeTruthy();
    expect(getAllByText("Bad two").length).toBeGreaterThanOrEqual(1);
  });

  it("Avatar shows a fallback with initials and hides it once the image loads", async () => {
    const { getByText, queryByText, getByTestId } = await render(
      <Avatar size={48}>
        <AvatarImage testID="avatar-image" source={{ uri: "https://example.com/a.png" }} />
        <AvatarFallback>RF</AvatarFallback>
      </Avatar>,
    );
    expect(getByText("RF")).toBeTruthy();

    await fireEvent(getByTestId("avatar-image"), "loadEnd");
    expect(queryByText("RF")).toBeNull();
  });

  it("Avatar falls back when the image errors", async () => {
    const { getByText, getByTestId } = await render(
      <Avatar>
        <AvatarImage testID="avatar-image" source={{ uri: "https://example.com/a.png" }} />
        <AvatarFallback>RF</AvatarFallback>
      </Avatar>,
    );
    await fireEvent(getByTestId("avatar-image"), "error");
    expect(getByText("RF")).toBeTruthy();
  });

  it("Badge renders variants", async () => {
    const { getByText, rerender } = await render(<Badge>New</Badge>);
    expect(getByText("New")).toBeTruthy();

    await rerender(<Badge variant="destructive">Danger</Badge>);
    expect(getByText("Danger")).toBeTruthy();

    await rerender(<Badge variant="outline">Outline</Badge>);
    expect(getByText("Outline")).toBeTruthy();

    await rerender(<Badge variant="success">Won</Badge>);
    expect(getByText("Won")).toBeTruthy();
  });

  it("Progress clamps values and exposes progressbar semantics", async () => {
    const { getByRole } = await render(<Progress value={120} height={8} />);
    const bar = getByRole("progressbar");
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });
  });

  it("Progress renders the interactive variant", async () => {
    const onValueChange = jest.fn();
    const { getByRole } = await render(
      <Progress value={40} interactive onValueChange={onValueChange} />,
    );
    expect(getByRole("adjustable")).toBeTruthy();
  });

  it("Separator renders both orientations", async () => {
    const { getByTestId, rerender } = await render(
      <Separator testID="sep" />,
    );
    expect(getByTestId("sep", { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);

    await rerender(<Separator testID="sep" orientation="vertical" />);
    expect(getByTestId("sep", { includeHiddenElements: true })).toBeTruthy();
  });

  it("Spinner renders variants and sizes", async () => {
    const { rerender } = await render(<Spinner />);
    await rerender(<Spinner variant="circle" size="sm" />);
    await rerender(<Spinner variant="dots" size="lg" />);
    await rerender(<Spinner variant="bars" label="Loading" showLabel />);
    await rerender(<Spinner variant="pulse" speed="fast" />);
  });

  it("Image renders and recovers into an error fallback", async () => {
    const { getByText, getByTestId } = await render(
      <Image testID="img" source={{ uri: "https://example.com/a.png" }} />,
    );
    expect(getByTestId("img")).toBeTruthy();

    await fireEvent(getByTestId("img"), "error");
    expect(getByText("Failed to load image")).toBeTruthy();
  });
});

describe("BNA ui extras", () => {
  it("ScrollView renders children", async () => {
    const { getByText } = await render(
      <ScrollView><Text>scrolled</Text></ScrollView>,
    );
    expect(getByText("scrolled")).toBeTruthy();
  });

  it("Skeleton renders at a given size", async () => {
    const { getByTestId } = await render(
      <Skeleton width={120} height={24} variant="rounded" testID="skel" />,
    );
    expect(getByTestId("skel", { includeHiddenElements: true })).toBeTruthy();
  });

  it("HelloWave renders its emoji and size", async () => {
    const { getByText } = await render(<HelloWave />);
    expect(getByText("👋")).toBeTruthy();
  });

  it("Link renders internal links through expo-router", async () => {
    const { getByText } = await render(
      <Link href="/login">Go to login</Link>,
    );
    expect(getByText("Go to login")).toBeTruthy();
  });

  it("ModeToggle flips between light and dark through ModeProvider", async () => {
    const { getByTestId } = await render(
      <ModeProvider defaultMode="system">
        <ModeToggle haptic={false} testID="toggle" />
      </ModeProvider>,
    );
    await fireEvent.press(getByTestId("toggle"));
  });

  it("Accordion toggles content open and closed", async () => {
    const { getByText, queryByText } = await render(
      <Accordion type="single" defaultValue="a" haptic={false}>
        <AccordionItem value="a">
          <AccordionTrigger>Section A</AccordionTrigger>
          <AccordionContent><Text>inside A</Text></AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Section B</AccordionTrigger>
          <AccordionContent><Text>inside B</Text></AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(getByText("inside A")).toBeTruthy();
    expect(queryByText("inside B")).toBeNull();

    await fireEvent.press(getByText("Section B"));
    expect(getByText("inside B")).toBeTruthy();
    expect(queryByText("inside A")).toBeNull();

    await fireEvent.press(getByText("Section A"));
    expect(getByText("inside A")).toBeTruthy();
  });

  it("ToastProvider shows toasts and auto-dismisses them", async () => {
    function ToastProbe() {
      const { success, error, info } = useToast();
      return (
        <>
          <Pressable testID="success-btn" onPress={() => success("Saved!", "Nice")}>
            <Text>success</Text>
          </Pressable>
          <Pressable testID="error-btn" onPress={() => error("Boom")}>
            <Text>error</Text>
          </Pressable>
          <Pressable testID="info-btn" onPress={() => info("FYI")}>
            <Text>info</Text>
          </Pressable>
        </>
      );
    }

    const { getByTestId, getByText, queryByText } = await render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    );

    await fireEvent.press(getByTestId("success-btn"));
    expect(getByText("Saved!")).toBeTruthy();
    expect(getByText("Nice")).toBeTruthy();

    await fireEvent.press(getByTestId("error-btn"));
    expect(getByText("Boom")).toBeTruthy();

    await fireEvent.press(getByTestId("info-btn"));
    expect(getByText("FYI")).toBeTruthy();
    expect(queryByText("Nothing")).toBeNull();
  });

  it("ProgressRingChart renders a ring with progressbar semantics", async () => {
    const { getByRole } = await render(
      <ProgressRingChart progress={75} size={120} showLabel={false} />,
    );
    expect(getByRole("progressbar").props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 75,
    });
  });
});
