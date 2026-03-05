import { useState, useCallback } from "react";
import DynamoLoader from "@/components/DynamoLoader";
import AppLayout from "@/components/AppLayout";
import HomePage from "@/pages/HomePage";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const handleComplete = useCallback(() => setLoading(false), []);

  if (loading) {
    return <DynamoLoader onComplete={handleComplete} duration={2200} />;
  }

  return (
    <AppLayout>
      <HomePage />
    </AppLayout>
  );
};

export default Index;
