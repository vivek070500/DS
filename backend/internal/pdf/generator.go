package pdf

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"unicode"

	"ds-enterprises/internal/models"

	"github.com/jung-kurt/gofpdf"
)

// sanitizeText removes non-ASCII characters and keeps only printable ASCII
// This is needed because gofpdf doesn't support Unicode fonts by default
func sanitizeText(s string) string {
	// Remove non-ASCII characters but keep basic punctuation and spaces
	var result strings.Builder
	for _, r := range s {
		if r <= 127 && unicode.IsPrint(r) {
			result.WriteRune(r)
		} else if r == '\n' || r == '\t' {
			result.WriteRune(r)
		}
		// Skip non-ASCII characters (Hindi, etc.)
	}
	
	// Clean up multiple spaces
	re := regexp.MustCompile(`\s+`)
	cleaned := re.ReplaceAllString(result.String(), " ")
	return strings.TrimSpace(cleaned)
}

// GenerateInspectionPDF generates a PDF matching the D.S. Enterprises form
func GenerateInspectionPDF(inspection *models.Inspection) (string, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(10, 10, 10)
	pdf.AddPage()

	// Colors
	headerBg := []int{13, 148, 136} // Teal

	// Header
	pdf.SetFillColor(headerBg[0], headerBg[1], headerBg[2])
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(190, 12, "D.S. ENTERPRISES", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "I", 10)
	pdf.CellFormat(190, 6, "Engineers, Approved Valuers & Project Consultants", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 8)
	pdf.CellFormat(190, 5, "Apartment No. 305, 3rd Floor, Krishna Complex, near Shri Devi Hospital and Bhanu Sagar Talkies,", "LR", 1, "C", true, 0, "")
	pdf.CellFormat(190, 5, "Vali Peer Road, Kalyan (West)- 421 301. Contact No: 0251-2209977 / 9324551620 / 9004601600 / 8451814444", "LRB", 1, "C", true, 0, "")

	// Reset colors
	pdf.SetTextColor(0, 0, 0)
	pdf.SetFillColor(240, 253, 250)

	// Person Visited and Inspection Date
	pdf.Ln(3)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(95, 8, fmt.Sprintf("Person Visited: %s", inspection.PersonVisited), "1", 0, "L", false, 0, "")
	pdf.CellFormat(95, 8, fmt.Sprintf("Inspection Date: %s", inspection.InspectionDate), "1", 1, "L", false, 0, "")

	// Form title
	pdf.SetFont("Arial", "I", 9)
	pdf.CellFormat(190, 6, "Details required for Flat / Shop/ Commercial Office/ Industrial /Land & Building/Row house/ Bunglow", "1", 1, "C", true, 0, "")

	pdf.Ln(2)

	// Helper function for table rows
	tableRow := func(label, value string) {
		pdf.SetFont("Arial", "", 9)
		pdf.CellFormat(60, 7, label, "1", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 9)
		pdf.CellFormat(130, 7, value, "1", 1, "L", false, 0, "")
	}

	// Basic Information Section
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(headerBg[0], headerBg[1], headerBg[2])
	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(190, 7, "BASIC INFORMATION", "1", 1, "C", true, 0, "")
	pdf.SetTextColor(0, 0, 0)

	// Road Size and RERA
	tableRow("Road Size", inspection.RoadSize)
	reraValue := "No"
	if inspection.ReraRegistered {
		reraValue = fmt.Sprintf("Yes - %s", inspection.ReraNumber)
	}
	tableRow("RERA Registered", reraValue)

	tableRow("Type of Case", inspection.TypeOfCase)
	tableRow("Bank Name", inspection.BankName)
	tableRow("Name of Applicant/s", inspection.ApplicantName)
	tableRow("Name of Project", inspection.ProjectName)

	// Multi-line address (sanitized to remove non-ASCII characters)
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(60, 7, "Property Address with Access Road", "1", 0, "L", false, 0, "")
	pdf.MultiCell(130, 7, sanitizeText(inspection.PropertyAddress), "1", "L", false)

	tableRow("Landmark", inspection.Landmark)
	
	// Person met at site with relation
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(60, 7, "Name of Person Met at Site", "1", 0, "L", false, 0, "")
	pdf.CellFormat(65, 7, inspection.PersonMetAtSite, "1", 0, "L", false, 0, "")
	pdf.CellFormat(30, 7, "Relation:", "1", 0, "L", false, 0, "")
	pdf.CellFormat(35, 7, inspection.RelationWithApplicant, "1", 1, "L", false, 0, "")

	// Boundaries Section
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(headerBg[0], headerBg[1], headerBg[2])
	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(190, 7, "BOUNDARIES DETAILS OF BUILDING", "1", 1, "C", true, 0, "")
	pdf.SetTextColor(0, 0, 0)

	tableRow("On or Towards East", inspection.BoundaryEast)
	tableRow("On or Towards West", inspection.BoundaryWest)
	tableRow("On or Towards North", inspection.BoundaryNorth)
	tableRow("On or Towards South", inspection.BoundarySouth)
	tableRow("Approach Road", inspection.ApproachRoad)
	
	// Road width with unit
	roadWidthValue := inspection.RoadWidth
	if roadWidthValue != "" && inspection.RoadWidthUnit != "" {
		roadWidthValue = fmt.Sprintf("%s %s", inspection.RoadWidth, inspection.RoadWidthUnit)
	}
	tableRow("Width of Road", roadWidthValue)

	// Property Details Section
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(headerBg[0], headerBg[1], headerBg[2])
	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(190, 7, "PROPERTY DETAILS", "1", 1, "C", true, 0, "")
	pdf.SetTextColor(0, 0, 0)

	tableRow("Number of Floors of Building", inspection.NumFloors)
	tableRow("Total Buildings in Complex / Wings", fmt.Sprintf("%s / %s", inspection.TotalBuildings, inspection.NumWings))
	tableRow("Total Flats / Per Floor Flats", fmt.Sprintf("%s / %s", inspection.TotalFlats, inspection.PerFloorFlats))
	
	flatTypes := strings.Join(inspection.FlatType, ", ")
	tableRow("Type of Flats/Shops/Office", flatTypes)
	tableRow("Carpet Area / Super Built Up Area", fmt.Sprintf("%s / %s sq ft", inspection.CarpetArea, inspection.SuperBuiltUpArea))
	tableRow("Number of Lifts", inspection.NumLifts)

	// Measurements Table
	if len(inspection.Measurements) > 0 {
		if pdf.GetY() > 200 {
			pdf.AddPage()
		}

		pdf.SetFont("Arial", "B", 10)
		pdf.SetFillColor(headerBg[0], headerBg[1], headerBg[2])
		pdf.SetTextColor(255, 255, 255)
		pdf.CellFormat(190, 7, "MEASUREMENTS", "1", 1, "C", true, 0, "")
		pdf.SetTextColor(0, 0, 0)

		// Table header
		pdf.SetFont("Arial", "B", 9)
		pdf.SetFillColor(240, 240, 240)
		pdf.CellFormat(70, 7, "Description", "1", 0, "C", true, 0, "")
		pdf.CellFormat(35, 7, "Length", "1", 0, "C", true, 0, "")
		pdf.CellFormat(35, 7, "Width", "1", 0, "C", true, 0, "")
		pdf.CellFormat(50, 7, "Total Area", "1", 1, "C", true, 0, "")

		// Table rows
		pdf.SetFont("Arial", "", 9)
		totalArea := 0.0
		for _, m := range inspection.Measurements {
			area := m.Length * m.Width
			totalArea += area
			pdf.CellFormat(70, 7, m.Description, "1", 0, "L", false, 0, "")
			pdf.CellFormat(35, 7, fmt.Sprintf("%.2f", m.Length), "1", 0, "C", false, 0, "")
			pdf.CellFormat(35, 7, fmt.Sprintf("%.2f", m.Width), "1", 0, "C", false, 0, "")
			pdf.CellFormat(50, 7, fmt.Sprintf("%.2f", area), "1", 1, "C", false, 0, "")
		}

		// Total row
		pdf.SetFont("Arial", "B", 9)
		pdf.SetFillColor(240, 253, 250)
		pdf.CellFormat(140, 7, "Total Area", "1", 0, "R", true, 0, "")
		pdf.CellFormat(50, 7, fmt.Sprintf("%.2f", totalArea), "1", 1, "C", true, 0, "")
	}

	// Check if we need a new page
	if pdf.GetY() > 220 {
		pdf.AddPage()
	}

	// Occupancy Section
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(headerBg[0], headerBg[1], headerBg[2])
	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(190, 7, "OCCUPANCY DETAILS", "1", 1, "C", true, 0, "")
	pdf.SetTextColor(0, 0, 0)

	tableRow("Flat Occupied or Not", inspection.OccupancyStatus)
	tableRow("Name of Property Occupant", inspection.OccupantName)
	tableRow("Occupied/Vacant Since (years)", inspection.OccupiedSince)
	tableRow("Building Occupancy %", inspection.BuildingOccupancyPercent)
	tableRow("Age of Building", inspection.AgeOfBuilding)
	tableRow("Surrounding Locality Development %", inspection.SurroundingDevelopmentPercent)

	// Financial Section
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(headerBg[0], headerBg[1], headerBg[2])
	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(190, 7, "FINANCIAL & DISTANCE DETAILS", "1", 1, "C", true, 0, "")
	pdf.SetTextColor(0, 0, 0)

	tableRow("Approx Rent of Property", inspection.ApproxRent)
	tableRow("Market Rate (as per estate agent)", inspection.MarketRate)
	tableRow("Distance from Nearest Railway Station", inspection.DistanceRailway)
	tableRow("Distance from Bus Stop", inspection.DistanceBus)
	tableRow("Distance from Hospital/School", inspection.DistanceHospital)

	// Check if we need a new page
	if pdf.GetY() > 200 {
		pdf.AddPage()
	}

	// Amenities Section
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(headerBg[0], headerBg[1], headerBg[2])
	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(190, 7, "AMENITIES PROVIDED/PROPOSED", "1", 1, "C", true, 0, "")
	pdf.SetTextColor(0, 0, 0)

	tableRow("Flooring", inspection.FlooringType)
	tableRow("Kitchen Platform", inspection.KitchenPlatform)
	tableRow("Wall Tiles - Kitchen", inspection.WallTilesKitchen)
	tableRow("Wall Tiles - Toilet/Bath", inspection.WallTilesToilet)
	tableRow("Windows", inspection.WindowsType)
	tableRow("M.S. Grill", inspection.MSGrill)

	// Construction Status Section (if applicable)
	if inspection.RCCWork != "" || inspection.BrickWork != "" {
		pdf.SetFont("Arial", "B", 10)
		pdf.SetFillColor(headerBg[0], headerBg[1], headerBg[2])
		pdf.SetTextColor(255, 255, 255)
		pdf.CellFormat(190, 7, "FOR UNDER CONSTRUCTION", "1", 1, "C", true, 0, "")
		pdf.SetTextColor(0, 0, 0)

		tableRow("RCC Work", inspection.RCCWork)
		tableRow("Brick Work", inspection.BrickWork)
		tableRow("Internal Plaster", inspection.InternalPlaster)
		tableRow("External Plaster", inspection.ExternalPlaster)
		tableRow("Flooring", inspection.FlooringWork)
		tableRow("Window/Door Fitting", inspection.WindowDoorFitting)
		tableRow("Painting and Finishing Works", inspection.PaintingFinishing)

		laboursAtSite := "No"
		if inspection.LaboursAtSite {
			laboursAtSite = fmt.Sprintf("Yes (%s)", inspection.NumLabours)
		}
		tableRow("Labours at Site", laboursAtSite)

		materialAtSite := "No"
		if inspection.ConstructionMaterialAtSite {
			materialAtSite = "Yes"
		}
		tableRow("Construction Material at Site", materialAtSite)
	}

	// Critical Remarks
	if inspection.CriticalRemarks != "" {
		if pdf.GetY() > 220 {
			pdf.AddPage()
		}

		pdf.SetFont("Arial", "B", 10)
		pdf.SetFillColor(headerBg[0], headerBg[1], headerBg[2])
		pdf.SetTextColor(255, 255, 255)
		pdf.CellFormat(190, 7, "CRITICAL REMARKS", "1", 1, "C", true, 0, "")
		pdf.SetTextColor(0, 0, 0)

		pdf.SetFont("Arial", "", 9)
		pdf.MultiCell(190, 6, sanitizeText(inspection.CriticalRemarks), "1", "L", false)
	}

	// Footer
	pdf.Ln(10)
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(95, 7, fmt.Sprintf("Inspected By: %s", sanitizeText(inspection.EmployeeName)), "", 0, "L", false, 0, "")
	// Sanitize location to remove Hindi/Unicode characters that gofpdf can't render
	pdf.CellFormat(95, 7, fmt.Sprintf("Location: %s", sanitizeText(inspection.Location)), "", 1, "R", false, 0, "")

	// Save PDF
	pdfDir := "generated_pdfs"
	if err := os.MkdirAll(pdfDir, 0755); err != nil {
		return "", err
	}

	pdfPath := filepath.Join(pdfDir, fmt.Sprintf("inspection_%s.pdf", inspection.ID))
	if err := pdf.OutputFileAndClose(pdfPath); err != nil {
		return "", err
	}

	return pdfPath, nil
}

