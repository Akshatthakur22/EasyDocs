import { describe, expect, it } from "vitest";
import { importCsv, importXlsx, normalizeHeader, suggestMapping } from "@/lib/dataset";

describe("dataset import and field suggestions", () => {
  it("preserves CSV strings and leading zeroes", async () => {
    const file = new File(["Student Name,Enrollment Number,Attendance\nAarav,0001842,62%\n"], "students.csv", { type: "text/csv" });
    const result = await importCsv(file);
    expect(result.headers).toEqual(["Student Name", "Enrollment Number", "Attendance"]);
    expect(result.rows[0]["Enrollment Number"]).toBe("0001842");
  });

  it("keeps duplicate headers distinct and warns the user", async () => {
    const file = new File(["Name,Name,\nA,B,C\n"], "duplicate.csv", { type: "text/csv" });
    const result = await importCsv(file);
    expect(result.headers).toEqual(["Name", "Name (2)", "Column 3"]);
    expect(result.rows[0]["Name (2)"]).toBe("B");
    expect(result.warnings).toHaveLength(1);
  });

  it("suggests normalized matches only when they are unambiguous", () => {
    expect(normalizeHeader(" Student_Name ")).toBe("studentname");
    expect(suggestMapping(["student_name", "attendance"], ["Student Name", "Attendance %"])).toEqual({
      student_name: "Student Name",
      attendance: "Attendance %",
    });
    expect(suggestMapping(["student_name"], ["Student Name", "student-name"])).toEqual({});
  });

  it("reads a selected XLSX sheet and uses displayed cell values", async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const roster = workbook.addWorksheet("Roster");
    roster.addRow(["Enrollment", "Student"]);
    roster.addRow(["00021", "Mira"]);
    workbook.addWorksheet("Notes").addRow(["ignore me"]);
    const bytes = await workbook.xlsx.writeBuffer();
    const file = new File([bytes], "students.xlsx");
    const result = await importXlsx(file, "Roster");
    expect(result.sheetNames).toEqual(["Roster", "Notes"]);
    expect(result.sheetName).toBe("Roster");
    expect(result.rows[0].Enrollment).toBe("00021");
  });
});
