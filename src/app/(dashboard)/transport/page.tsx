import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoutesClient from "@/components/transport/routes-client";
import VehiclesClient from "@/components/transport/vehicles-client";
import DriversClient from "@/components/transport/drivers-client";
import TransportAssignmentsClient from "@/components/transport-assignments-client";

export const metadata = {
  title: "Transport | School Management System",
  description: "Manage school transport, routes, vehicles and drivers",
};

interface Stop {
  name: string;
  estimatedTime: string;
}

interface RouteWithStops {
  id: string;
  name: string;
  code: string;
  startPoint: string;
  endPoint: string;
  stops: Stop[];
  vehicleId: string | null;
  vehicle: {
    id: string;
    registration: string;
    make: string;
    model: string;
    driver?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string | null;
    } | null;
  } | null;
  _count?: { studentTransports: number };
}

interface DriverForClient {
  id: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  licenseExpiry: string;
  phone: string | null;
  vehicle?: {
    id: string;
    registration: string;
    make: string;
    model: string;
  } | null;
}

function parseStops(stops: unknown): Stop[] {
  if (!stops || !Array.isArray(stops)) return [];
  return stops.map((stop: { name?: string; estimatedTime?: string }) => ({
    name: stop.name || "",
    estimatedTime: stop.estimatedTime || "",
  }));
}

export default async function TransportPage() {
  const session = await auth();
  const userRole = session?.user?.role;
  const schoolId = session?.user?.schoolId;

  // Fetch initial data
  const [routes, vehicles, drivers, students] = await Promise.all([
    // Routes
    schoolId
      ? prisma.route.findMany({
          where: { schoolId },
          include: {
            Vehicle: {
              select: {
                id: true,
                registration: true,
                make: true,
                model: true,
                Driver: {
                  select: { id: true, firstName: true, lastName: true, phone: true },
                },
              },
            },
            _count: { select: { StudentTransport: true } },
          },
          orderBy: { name: "asc" },
        })
      : [],
    // Vehicles
    schoolId
      ? prisma.vehicle.findMany({
          where: { schoolId },
          include: {
            Driver: {
              select: { id: true, firstName: true, lastName: true, phone: true, licenseNumber: true },
            },
            Route: { select: { id: true, name: true, code: true } },
          },
          orderBy: { registration: "asc" },
        })
      : [],
    // Drivers
    prisma.driver.findMany({
      include: {
        Vehicle: {
          select: {
            id: true,
            registration: true,
            make: true,
            model: true,
            schoolId: true,
          },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    // Students
    schoolId
      ? prisma.student.findMany({
          where: { schoolId, status: "ACTIVE" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
            Section: {
              select: { id: true, name: true, Class: { select: { id: true, name: true } } },
            },
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          take: 100,
        })
      : [],
  ]);

  // Filter drivers by school and transform for client
  const filteredDrivers: DriverForClient[] = drivers
    .filter(
      (d) => !d.Vehicle || d.Vehicle.schoolId === schoolId || userRole === "SUPER_ADMIN"
    )
    .map((d) => ({
      id: d.id,
      firstName: d.firstName,
      lastName: d.lastName,
      licenseNumber: d.licenseNumber,
      licenseExpiry: d.licenseExpiry.toISOString(),
      phone: d.phone,
      vehicle: d.Vehicle
        ? {
            id: d.Vehicle.id,
            registration: d.Vehicle.registration,
            make: d.Vehicle.make,
            model: d.Vehicle.model,
          }
        : null,
    }));

  const canManage = userRole === "SUPER_ADMIN" || userRole === "SCHOOL_ADMIN";

  // Transform routes to properly type the stops JSON field and use lowercase for client
  const typedRoutes: RouteWithStops[] = routes.map((route) => ({
    ...route,
    stops: parseStops(route.stops),
    vehicle: route.Vehicle
      ? {
          id: route.Vehicle.id,
          registration: route.Vehicle.registration,
          make: route.Vehicle.make,
          model: route.Vehicle.model,
          driver: route.Vehicle.Driver
            ? {
                id: route.Vehicle.Driver.id,
                firstName: route.Vehicle.Driver.firstName,
                lastName: route.Vehicle.Driver.lastName,
                phone: route.Vehicle.Driver.phone,
              }
            : null,
        }
      : null,
    _count: { studentTransports: route._count.StudentTransport },
  }));

  // Transform vehicles for client
  const transformedVehicles = vehicles.map((v) => ({
    ...v,
    driver: v.Driver
      ? {
          id: v.Driver.id,
          firstName: v.Driver.firstName,
          lastName: v.Driver.lastName,
          phone: v.Driver.phone,
          licenseNumber: v.Driver.licenseNumber,
        }
      : null,
    routes: v.Route,
  }));

  // Transform students for client
  const transformedStudents = students.map((s) => ({
    ...s,
    section: s.Section
      ? {
          id: s.Section.id,
          name: s.Section.name,
          class: s.Section.Class,
        }
      : null,
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transport Management</h1>
        <p className="text-gray-600 mt-1">
          Manage routes, vehicles, drivers and student transport assignments
        </p>
      </div>

      <Tabs defaultValue="routes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="assignments">Student Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="routes">
          <RoutesClient
            initialRoutes={typedRoutes}
            vehicles={transformedVehicles}
            drivers={filteredDrivers}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="vehicles">
          <VehiclesClient
            initialVehicles={transformedVehicles}
            drivers={filteredDrivers}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="drivers">
          <DriversClient
            initialDrivers={filteredDrivers}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="assignments">
          <TransportAssignmentsClient
            initialAssignments={[]}
            routes={typedRoutes}
            students={transformedStudents}
            canManage={canManage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
